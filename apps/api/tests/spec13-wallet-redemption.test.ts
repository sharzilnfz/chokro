// SPEC 13: Green Wallet Settlement, Liability Caps & MFS Payout Engine (Ticket 09a / Imran Ahmed Upom m4)
import crypto from 'crypto';
import {
  db,
  creditTxns,
  depositRecords,
  dropSessions,
  dropZones,
  partners,
  trustDecisions,
  fraudFlags,
  liabilityCaps,
  redemptionRequests,
  payoutRecords,
  disputes,
  eq,
  desc,
} from '@chokro/db';
import { POST as requestRedemptionRoute, GET as getRedemptionsRoute } from '../app/api/v1/wallet/redemptions/route';
import { POST as cancelRedemptionRoute } from '../app/api/v1/wallet/redemptions/[id]/cancel/route';
import { POST as settleRedemptionRoute } from '../app/api/v1/wallet/redemptions/[id]/settle/route';
import { GET as adminRedemptionsRoute } from '../app/api/v1/admin/wallet/redemptions/route';
import {
  GET as getLiabilityRoute,
  POST as updateLiabilityRoute,
} from '../app/api/v1/admin/wallet/liability/route';
import { GET as getWalletBalance } from '../app/api/v1/wallet/balance/route';
import { POST as adjustWallet } from '../app/api/v1/admin/wallet/adjust/route';
import { POST as evaluateTrustGateRoute } from '../app/api/v1/trust-gate/evaluate/route';
import { SettlementDomain } from '../lib/domain/SettlementDomain';
import { WalletDomain } from '../lib/domain/WalletDomain';
import { TrustGateDomain } from '../lib/domain/TrustGateDomain';
import { CreditVerificationDomain } from '../lib/domain/CreditVerificationDomain';
import {
  authHeaders,
  createTestUser,
  resetTestStore,
  tokenFor,
  routeParams,
} from './test-utils';

describe('SPEC 13: Wallet Settlement & MFS Cash-Out Engine (Ticket 09a)', () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let admin: Awaited<ReturnType<typeof createTestUser>>;
  let userToken: string;
  let adminToken: string;

  beforeEach(async () => {
    await resetTestStore();
    delete process.env.SIMULATE_GATEWAY_FAILURE;
    delete process.env.SSLCOMMERZ_STORE_ID;
    delete process.env.SSLCOMMERZ_STORE_PASSWD;

    user = await createTestUser('INDIVIDUAL', 'student@campus.ac.bd');
    admin = await createTestUser('ADMIN', 'admin@chokro.org');
    userToken = tokenFor(user);
    adminToken = tokenFor(admin);
  });

  // =========================================================================
  // 1. FULL LOOP END-TO-END TEST
  // =========================================================================
  describe('1. Full Circular Economy Loop (Deposit -> Verification -> Redemption -> Payout)', () => {
    it('closes the loop: deposit -> trust gate auto-clears -> verified balance -> redemption -> payout -> derived balance is zero', async () => {
      // Step A: Seed earned credit through deposit & Trust Gate auto-clear via single owner
      const depositId = crypto.randomUUID();
      await CreditVerificationDomain.mintPending({
        userId: user.id,
        amount: 150,
        kind: 'DEPOSIT',
        subjectId: depositId,
      });

      // Evaluate Trust Gate via domain (server-assembled; route is admin-only)
      const gateResBody = await TrustGateDomain.evaluateAndApply(
        {
          subjectType: 'DEPOSIT',
          subjectId: depositId,
          userId: user.id,
          category: 'PLASTICS',
          declaredQuantity: 10,
          verifiedQuantity: 10,
          unit: 'kg',
          isSessionValid: true,
        } as any,
        { userId: admin.id, role: 'ADMIN' }
      );
      expect(gateResBody.decision).toBe('AUTO_CLEAR');

      // Verify spendable balance is now 150 BDT
      const balRes1 = await getWalletBalance(
        new Request('http://localhost/api/v1/wallet/balance', {
          headers: authHeaders(userToken),
        })
      );
      const bal1 = await balRes1.json();
      expect(bal1.balance.verified).toBe(150);
      expect(bal1.balance.pending).toBe(0);

      // Step B: Submit redemption cash-out request for full 150 BDT via bKash
      const redeemRes = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 150,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );
      expect(redeemRes.status).toBe(201);
      const redeemBody = await redeemRes.json();

      expect(redeemBody.redemption.status).toBe('PAID');
      expect(redeemBody.redemption.gross_amount_bdt).toBe('150.00');
      expect(Number(redeemBody.redemption.fee_bdt)).toBeCloseTo(2.78, 1);
      expect(Number(redeemBody.redemption.net_amount_bdt)).toBeCloseTo(147.22, 1);
      expect(redeemBody.payout).toBeDefined();
      expect(redeemBody.payout.gateway_ref).toMatch(/^MFS-/);

      // Step C: Verify Ledger has EARN and REDEEM rows
      const txns = await db
        .select()
        .from(creditTxns)
        .where(eq(creditTxns.user_id, user.id))
        .orderBy(desc(creditTxns.created_at));

      expect(txns.length).toBe(2);
      const redeemLedgerRow = txns.find((t) => t.kind === 'REDEEM');
      expect(redeemLedgerRow).toBeDefined();
      expect(redeemLedgerRow?.status).toBe('VERIFIED');
      expect(Number(redeemLedgerRow?.amount)).toBe(150);

      // Step D: Derived balance is now 0 verified, 0 pending
      const balRes2 = await getWalletBalance(
        new Request('http://localhost/api/v1/wallet/balance', {
          headers: authHeaders(userToken),
        })
      );
      const bal2 = await balRes2.json();
      expect(bal2.balance.verified).toBe(0);
      expect(bal2.balance.pending).toBe(0);
    });
  });

  // =========================================================================
  // 2. REDEMPTION GUARDS & REFUSAL TESTS
  // =========================================================================
  describe('2. Redemption Guards & Refusal Cases', () => {
    beforeEach(async () => {
      // Give user 100 verified credits
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 100, reason: 'Test credits' }),
        })
      );
    });

    it('refuses request below minimum redemption threshold (৳50.00)', async () => {
      const res = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 20, // Below min (50)
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/below minimum required ৳50\.00/i);
    });

    it('refuses request exceeding verified balance', async () => {
      const res = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 250, // Exceeds balance of 100
            payoutChannel: 'NAGAD',
            accountNumber: '01811223344',
          }),
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/exceeds verified balance/i);
    });

    it('excludes pending credits from redeemable balance', async () => {
      // Add 200 pending credits
      await db.insert(creditTxns).values({
        user_id: user.id,
        amount: '200.00',
        kind: 'EARN',
        status: 'PENDING',
      });

      // User has 100 verified and 200 pending (total 300). Requesting 150 must fail!
      const res = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 150,
            payoutChannel: 'ROCKET',
            accountNumber: '01911223344',
          }),
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/exceeds verified balance/i);
    });

    it('refuses request exceeding monthly per-user cap and reports remaining allowance', async () => {
      // Set monthly user cap to 100 BDT
      await updateLiabilityRoute(
        new Request('http://localhost/api/v1/admin/wallet/liability', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            monthlyPlatformCapBdt: 100000,
            monthlyUserCapBdt: 100, // Low cap
            minRedemptionBdt: 50,
            feePercentage: 1.85,
          }),
        })
      );

      // Redeem 60 BDT
      const res1 = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 60,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );
      expect(res1.status).toBe(201);

      // Top up user with 100 more verified credits so verified balance is 140
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 100, reason: 'Additional credits' }),
        })
      );

      // Try to redeem 50 BDT more (60 + 50 = 110 > 100 cap)
      const res2 = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 50,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );
      expect(res2.status).toBe(400);
      const data2 = await res2.json();
      expect(data2.error).toMatch(/exceeds monthly allowance/i);
      expect(data2.error).toMatch(/remaining allowance: ৳40\.00/i);
    });


    it('refuses request when platform monthly liability cap is reached', async () => {
      // Set platform monthly cap to 100 BDT
      await updateLiabilityRoute(
        new Request('http://localhost/api/v1/admin/wallet/liability', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            monthlyPlatformCapBdt: 100, // Very low platform cap
            monthlyUserCapBdt: 5000,
            minRedemptionBdt: 50,
            feePercentage: 1.85,
          }),
        })
      );

      // Redeem 60 BDT
      await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 60,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );

      // Create a second user with 100 credits
      const user2 = await createTestUser('INDIVIDUAL', 'user2@chokro.org');
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user2.id, amount: 100, reason: 'Credits for user 2' }),
        })
      );

      // User 2 requests 50 BDT (60 + 50 = 110 > 100 platform cap)
      const res = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(tokenFor(user2)),
          body: JSON.stringify({
            amountCredits: 50,
            payoutChannel: 'NAGAD',
            accountNumber: '01811223344',
          }),
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/platform monthly liability cap reached/i);
    });

    it('refuses user with high active fraud flags', async () => {
      // Seed 3 active fraud flags on user
      for (let i = 0; i < 3; i++) {
        await db.insert(fraudFlags).values({
          entity_type: 'USER',
          entity_id: user.id,
          flag_type: 'SUSPICIOUS_VELOCITY',
          reason: 'Test fraud flag',
          severity: 'HIGH',
        });
      }

      const res = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 50,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/account is under review/i);
    });
  });

  // =========================================================================
  // 3. CONCURRENCY OVERDRAW CONFLICT PROTECTION
  // =========================================================================
  describe('3. Concurrency Overdraw Conflict Protection', () => {
    it('handles two simultaneous requests that individually fit balance but jointly exceed it: exactly one accepted, one conflict, balance never negative', async () => {
      // User has 100 verified credits
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 100, reason: 'Starting 100 balance' }),
        })
      );

      // Fire two 80 BDT requests concurrently in parallel
      const makeRequest = () =>
        requestRedemptionRoute(
          new Request('http://localhost/api/v1/wallet/redemptions', {
            method: 'POST',
            headers: authHeaders(userToken),
            body: JSON.stringify({
              amountCredits: 80,
              payoutChannel: 'BKASH',
              accountNumber: '01711223344',
            }),
          })
        );

      const [res1, res2] = await Promise.all([makeRequest(), makeRequest()]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one must succeed (201) and one must be rejected (400 or 409)
      expect(statuses[0]).toBe(201);
      expect([400, 409]).toContain(statuses[1]);

      // Final balance check: remaining verified balance must be exactly 20 (100 - 80), NEVER negative!
      const balRes = await getWalletBalance(
        new Request('http://localhost/api/v1/wallet/balance', {
          headers: authHeaders(userToken),
        })
      );
      const bal = await balRes.json();
      expect(bal.balance.verified).toBe(20);
      expect(bal.balance.pending).toBe(0);
    });
  });

  // =========================================================================
  // 4. TRUST GATE ESCALATION & ADMIN SETTLEMENT
  // =========================================================================
  describe('4. Trust Gate Escalation & Admin Settlement Worklist', () => {
    it('escalates new account requesting large redemption and allows admin approval', async () => {
      // Give user 1500 credits
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 1500, reason: 'Large grant' }),
        })
      );

      // Submit large cash-out request (1200 > 1000 large claim threshold with 0 day account age)
      const res = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 1200,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.decision).toBe('ESCALATE');
      expect(body.redemption.status).toBe('ESCALATED');

      // While ESCALATED, credits are held by derivation (1500 - 1200 = 300)
      const balRes1 = await getWalletBalance(
        new Request('http://localhost/api/v1/wallet/balance', {
          headers: authHeaders(userToken),
        })
      );
      const bal1 = await balRes1.json();
      expect(bal1.balance.verified).toBe(300);

      // Admin views worklist (A10)
      const adminQueueRes = await adminRedemptionsRoute(
        new Request('http://localhost/api/v1/admin/wallet/redemptions?status=ESCALATED', {
          headers: authHeaders(adminToken),
        })
      );
      expect(adminQueueRes.status).toBe(200);
      const adminQueue = await adminQueueRes.json();
      const item = adminQueue.redemptions.find((r: any) => r.id === body.redemption.id);
      expect(item).toBeDefined();

      // Admin approves and disburses payout
      const settleRes = await settleRedemptionRoute(
        new Request(`http://localhost/api/v1/wallet/redemptions/${body.redemption.id}/settle`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ action: 'APPROVE' }),
        }),
        routeParams(body.redemption.id)
      );
      expect(settleRes.status).toBe(200);
      const settleBody = await settleRes.json();
      expect(settleBody.redemption.status).toBe('PAID');
      expect(settleBody.payout).toBeDefined();

      // Final balance remains 300
      const balRes2 = await getWalletBalance(
        new Request('http://localhost/api/v1/wallet/balance', {
          headers: authHeaders(userToken),
        })
      );
      const bal2 = await balRes2.json();
      expect(bal2.balance.verified).toBe(300);
    });

    it('admin rejection of escalated redemption releases hold and restores balance via compensating entry', async () => {
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 1500, reason: 'Large grant' }),
        })
      );

      const res = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 1200,
            payoutChannel: 'NAGAD',
            accountNumber: '01811223344',
          }),
        })
      );
      const body = await res.json();
      expect(body.redemption.status).toBe('ESCALATED');

      // Admin rejects with reason
      const settleRes = await settleRedemptionRoute(
        new Request(`http://localhost/api/v1/wallet/redemptions/${body.redemption.id}/settle`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            action: 'REJECT',
            reason: 'Suspicious transaction pattern from unverified device',
          }),
        }),
        routeParams(body.redemption.id)
      );
      expect(settleRes.status).toBe(200);
      const settleBody = await settleRes.json();
      expect(settleBody.redemption.status).toBe('REJECTED');
      expect(settleBody.compensatingTxn).toBeDefined();

      // Balance is fully restored back to 1500
      const balRes = await getWalletBalance(
        new Request('http://localhost/api/v1/wallet/balance', {
          headers: authHeaders(userToken),
        })
      );
      const bal = await balRes.json();
      expect(bal.balance.verified).toBe(1500);
    });

    it('blocks admin approval while an open dispute exists on the redemption: 409 before any payout, PAID flip, or ledger write', async () => {
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 1500, reason: 'Large grant' }),
        })
      );

      const res = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 1200,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.redemption.status).toBe('ESCALATED');

      // Open a dispute against the redemption subject (same subjectType/subjectId
      // the Trust Gate was evaluated with in requestRedemption)
      await db.insert(disputes).values({
        source_type: 'REDEMPTION',
        source_id: body.redemption.id,
        opened_by: admin.id,
        against_user_id: user.id,
        reason: 'test dispute blocks settlement',
        status: 'OPEN',
      });

      const rowsBefore = await db.select().from(creditTxns).where(eq(creditTxns.user_id, user.id));

      const settleRes = await settleRedemptionRoute(
        new Request(`http://localhost/api/v1/wallet/redemptions/${body.redemption.id}/settle`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ action: 'APPROVE' }),
        }),
        routeParams(body.redemption.id)
      );
      expect(settleRes.status).toBe(409);
      const settleBody = await settleRes.json();
      expect(settleBody.error).toMatch(/dispute/i);

      // Money never moved: no payout record, no PAID flip, zero new ledger rows
      const payouts = await db
        .select()
        .from(payoutRecords)
        .where(eq(payoutRecords.redemption_id, body.redemption.id));
      expect(payouts.length).toBe(0);

      const [redemption] = await db
        .select()
        .from(redemptionRequests)
        .where(eq(redemptionRequests.id, body.redemption.id));
      expect(redemption.status).toBe('ESCALATED');

      const rowsAfter = await db.select().from(creditTxns).where(eq(creditTxns.user_id, user.id));
      expect(rowsAfter.length).toBe(rowsBefore.length);
    });

    it('blocks admin RETRY while an open dispute exists on the redemption: 409 before any gateway call, payout record, or ledger write', async () => {
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 200, reason: 'Initial balance' }),
        })
      );

      // Attempt 1 fails at the gateway -> FAILED with exactly one payout record
      process.env.SIMULATE_GATEWAY_FAILURE = 'true';
      const res = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 100,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );
      const body = await res.json();
      expect(body.redemption.status).toBe('FAILED');
      delete process.env.SIMULATE_GATEWAY_FAILURE;

      const payoutsBefore = await db
        .select()
        .from(payoutRecords)
        .where(eq(payoutRecords.redemption_id, body.redemption.id));
      expect(payoutsBefore.length).toBe(1);

      // Open a dispute against the redemption subject
      await db.insert(disputes).values({
        source_type: 'REDEMPTION',
        source_id: body.redemption.id,
        opened_by: admin.id,
        against_user_id: user.id,
        reason: 'test dispute blocks retry',
        status: 'OPEN',
      });

      const rowsBefore = await db.select().from(creditTxns).where(eq(creditTxns.user_id, user.id));

      // Spy proves the gateway is never reached while the dispute is open
      const payoutSpy = jest.spyOn(SettlementDomain, 'executePayout');

      const retryRes = await settleRedemptionRoute(
        new Request(`http://localhost/api/v1/wallet/redemptions/${body.redemption.id}/settle`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ action: 'RETRY' }),
        }),
        routeParams(body.redemption.id)
      );
      expect(retryRes.status).toBe(409);
      const retryBody = await retryRes.json();
      expect(retryBody.error).toMatch(/dispute/i);

      // Money never moved: no gateway call, no new payout record, zero new ledger rows
      expect(payoutSpy).not.toHaveBeenCalled();

      const payoutsAfter = await db
        .select()
        .from(payoutRecords)
        .where(eq(payoutRecords.redemption_id, body.redemption.id));
      expect(payoutsAfter.length).toBe(1);

      const [redemption] = await db
        .select()
        .from(redemptionRequests)
        .where(eq(redemptionRequests.id, body.redemption.id));
      expect(redemption.status).toBe('FAILED');

      const rowsAfter = await db.select().from(creditTxns).where(eq(creditTxns.user_id, user.id));
      expect(rowsAfter.length).toBe(rowsBefore.length);

      payoutSpy.mockRestore();
    });
  });

  // =========================================================================
  // 5. USER CANCELLATION
  // =========================================================================
  describe('5. User Cancellation', () => {
    it('user cancels open redemption, transitions to CANCELLED, and restores balance via compensating entry', async () => {
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 1200, reason: 'Initial balance' }),
        })
      );

      // Create escalated request
      const reqRes = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 1100,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );
      const reqBody = await reqRes.json();

      // Balance held: 1200 - 1100 = 100
      const balBefore = await getWalletBalance(
        new Request('http://localhost/api/v1/wallet/balance', {
          headers: authHeaders(userToken),
        })
      );
      expect((await balBefore.json()).balance.verified).toBe(100);

      // User cancels
      const cancelRes = await cancelRedemptionRoute(
        new Request(`http://localhost/api/v1/wallet/redemptions/${reqBody.redemption.id}/cancel`, {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({ reason: 'Changed mind, need credits for auction bid' }),
        }),
        routeParams(reqBody.redemption.id)
      );
      expect(cancelRes.status).toBe(200);
      const cancelBody = await cancelRes.json();
      expect(cancelBody.redemption.status).toBe('CANCELLED');

      // Balance restored back to 1200
      const balAfter = await getWalletBalance(
        new Request('http://localhost/api/v1/wallet/balance', {
          headers: authHeaders(userToken),
        })
      );
      expect((await balAfter.json()).balance.verified).toBe(1200);
    });
  });

  // =========================================================================
  // 6. FAILED SETTLEMENT, COMPENSATING ENTRIES & RETRY
  // =========================================================================
  describe('6. Failed MFS Settlement, Compensating Entries & Retry', () => {
    it('creates compensating entry on gateway failure, preserves original REDEEM row, and allows retry without double-deducting', async () => {
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 200, reason: 'Initial balance' }),
        })
      );

      // Force gateway failure
      process.env.SIMULATE_GATEWAY_FAILURE = 'true';

      const res = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 100,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );
      const body = await res.json();
      expect(body.redemption.status).toBe('FAILED');
      expect(body.payout.status).toBe('FAILED');

      // Assert append-only invariant: original REDEEM row is intact, and compensating ADJUST row exists
      const txns = await db
        .select()
        .from(creditTxns)
        .where(eq(creditTxns.user_id, user.id))
        .orderBy(desc(creditTxns.created_at));

      const redeemRow = txns.find((t) => t.kind === 'REDEEM');
      const compRow = txns.find((t) => t.kind === 'ADJUST' && t.reason?.includes('Compensating reversal'));
      expect(redeemRow).toBeDefined();
      expect(compRow).toBeDefined();
      expect(Number(compRow?.amount)).toBe(100);

      // Balance is fully restored: 200 - 100 (redeem) + 100 (comp) = 200
      const balRes1 = await getWalletBalance(
        new Request('http://localhost/api/v1/wallet/balance', {
          headers: authHeaders(userToken),
        })
      );
      expect((await balRes1.json()).balance.verified).toBe(200);

      // Now clear the failure simulation and retry the payout
      delete process.env.SIMULATE_GATEWAY_FAILURE;

      const retryRes = await settleRedemptionRoute(
        new Request(`http://localhost/api/v1/wallet/redemptions/${body.redemption.id}/settle`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ action: 'RETRY' }),
        }),
        routeParams(body.redemption.id)
      );
      expect(retryRes.status).toBe(200);
      const retryBody = await retryRes.json();
      expect(retryBody.redemption.status).toBe('PAID');
      expect(retryBody.payout.status).toBe('SIMULATED');

      // Final balance is 100 (exactly one 100 BDT cash-out completed)
      const balRes2 = await getWalletBalance(
        new Request('http://localhost/api/v1/wallet/balance', {
          headers: authHeaders(userToken),
        })
      );
      expect((await balRes2.json()).balance.verified).toBe(100);

      // Retry re-deducts with a DETERMINISTIC per-attempt ref (attempt 2: one
      // FAILED payout already recorded) — no Date.now() ref, exactly one retry row.
      const txnsAfterRetry = await db
        .select()
        .from(creditTxns)
        .where(eq(creditTxns.user_id, user.id));
      const retryRows = txnsAfterRetry.filter((t) => t.custody_ref?.startsWith('REDEMPTION-RETRY-'));
      expect(retryRows.length).toBe(1);
      expect(retryRows[0].custody_ref).toBe(`REDEMPTION-RETRY-${body.redemption.id}-2`);
      expect(retryRows[0].status).toBe('VERIFIED');
      expect(
        txnsAfterRetry.some((t) => /REDEMPTION-RETRY-.*-\d{13}/.test(t.custody_ref ?? ''))
      ).toBe(false);
    });

    it('crash window: a THROWN gateway error leaves no PAID status and restores credits via the single reversal helper', async () => {
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 200, reason: 'Initial balance' }),
        })
      );

      // Simulate the MFS call throwing mid-settlement (network crash), not returning failure
      const payoutSpy = jest
        .spyOn(SettlementDomain, 'executePayout')
        .mockRejectedValue(new Error('MFS gateway connection reset'));

      try {
        const res = await requestRedemptionRoute(
          new Request('http://localhost/api/v1/wallet/redemptions', {
            method: 'POST',
            headers: authHeaders(userToken),
            body: JSON.stringify({
              amountCredits: 100,
              payoutChannel: 'BKASH',
              accountNumber: '01711223344',
            }),
          })
        );
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.error).toBeDefined();
        expect(body.redemption.status).toBe('FAILED');

        // No redemption anywhere reached PAID
        const redemptions = await db.select().from(redemptionRequests);
        expect(redemptions.some((r) => r.status === 'PAID')).toBe(false);

        // The FAILED payout attempt is persisted alongside the FAILED flip
        const payouts = await db.select().from(payoutRecords);
        expect(payouts.length).toBe(1);
        expect(payouts[0].status).toBe('FAILED');

        // Compensating-entry rules live in ONE place: one NEW append-only
        // VERIFIED ADJUST row carrying the REVERSAL-FAIL-<id> ref.
        const txns = await db.select().from(creditTxns).where(eq(creditTxns.user_id, user.id));
        const compRows = txns.filter(
          (t) => t.kind === 'ADJUST' && t.custody_ref?.startsWith('REVERSAL-')
        );
        expect(compRows.length).toBe(1);
        expect(compRows[0].custody_ref).toBe(`REVERSAL-FAIL-${body.redemption.id}`);
        expect(compRows[0].source_id).toBe(body.redemption.id);
        expect(compRows[0].status).toBe('VERIFIED');
        expect(Number(compRows[0].amount)).toBe(100);

        // The original REDEEM hold row was already released to VERIFIED by the
        // Trust Gate auto-clear (before payout) — the crash window is about the
        // deducted balance and the redemption status, both now repaired.
        const redeemRow = txns.find((t) => t.kind === 'REDEEM');
        expect(redeemRow?.status).toBe('VERIFIED');

        // Balance fully restored: 200 - 100 (redeem) + 100 (compensating)
        const balRes = await getWalletBalance(
          new Request('http://localhost/api/v1/wallet/balance', {
            headers: authHeaders(userToken),
          })
        );
        expect((await balRes.json()).balance.verified).toBe(200);
      } finally {
        payoutSpy.mockRestore();
      }
    });

    it('crash window: gateway succeeds but settlement persistence fails -> the whole unit rolls back atomically (no PAID, credits stay PENDING, no orphan payout)', async () => {
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 1500, reason: 'Large grant' }),
        })
      );

      // Escalated redemption: the REDEEM hold row stays PENDING through review
      const reqRes = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 1200,
            payoutChannel: 'NAGAD',
            accountNumber: '01811223344',
          }),
        })
      );
      const reqBody = await reqRes.json();
      expect(reqBody.redemption.status).toBe('ESCALATED');

      // Gateway succeeds but persistence crashes INSIDE the settlement
      // transaction (the in-tx ledger verify rejects) — payout record insert,
      // PAID flip, and credit verify must roll back as ONE unit.
      const verifySpy = jest
        .spyOn(CreditVerificationDomain, 'verifyWithin')
        .mockRejectedValue(new Error('db crash mid-settlement'));

      try {
        const settleRes = await settleRedemptionRoute(
          new Request(`http://localhost/api/v1/wallet/redemptions/${reqBody.redemption.id}/settle`, {
            method: 'POST',
            headers: authHeaders(adminToken),
            body: JSON.stringify({ action: 'APPROVE' }),
          }),
          routeParams(reqBody.redemption.id)
        );
        // The crash surfaces as a uniform DB-unavailable response…
        expect(settleRes.status).toBe(503);

        // NO PAID status anywhere
        const redemptions = await db.select().from(redemptionRequests);
        expect(redemptions.some((r) => r.status === 'PAID')).toBe(false);
        expect(redemptions.find((r) => r.id === reqBody.redemption.id)?.status).toBe('ESCALATED');

        // No orphan payout record — nothing leaked out of the rolled-back tx
        expect((await db.select().from(payoutRecords)).length).toBe(0);

        // Credits NOT verified: the held REDEEM row is still PENDING
        const txns = await db.select().from(creditTxns).where(eq(creditTxns.user_id, user.id));
        const redeemRow = txns.find((t) => t.kind === 'REDEEM');
        expect(redeemRow?.status).toBe('PENDING');
      } finally {
        verifySpy.mockRestore();
      }
    });

    it('verify-inside-tx: after successful settlement the credit row is VERIFIED in the same read that sees PAID', async () => {
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 1500, reason: 'Large grant' }),
        })
      );

      const reqRes = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 1200,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );
      const reqBody = await reqRes.json();
      expect(reqBody.redemption.status).toBe('ESCALATED');

      const settleRes = await settleRedemptionRoute(
        new Request(`http://localhost/api/v1/wallet/redemptions/${reqBody.redemption.id}/settle`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ action: 'APPROVE' }),
        }),
        routeParams(reqBody.redemption.id)
      );
      expect(settleRes.status).toBe(200);

      // One read sees BOTH the PAID flip and the VERIFIED credit flip
      const [redemption] = await db
        .select()
        .from(redemptionRequests)
        .where(eq(redemptionRequests.id, reqBody.redemption.id));
      expect(redemption.status).toBe('PAID');

      const txns = await db.select().from(creditTxns).where(eq(creditTxns.user_id, user.id));
      const redeemRow = txns.find((t) => t.kind === 'REDEEM');
      expect(redeemRow?.status).toBe('VERIFIED');
      expect(redeemRow?.trust_decision_id).toBe(redemption.trust_decision_id);
    });

    it('blocks retry beyond MAX_PAYOUT_ATTEMPTS with a 409 DomainRuleError and mints zero new ledger rows', async () => {
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 200, reason: 'Initial balance' }),
        })
      );

      // Attempt 1: initial request fails at the gateway -> FAILED + REDEEM/ADJUST pair
      process.env.SIMULATE_GATEWAY_FAILURE = 'true';
      const res1 = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 100,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );
      const body1 = await res1.json();
      expect(body1.redemption.status).toBe('FAILED');

      const retry = () =>
        settleRedemptionRoute(
          new Request(`http://localhost/api/v1/wallet/redemptions/${body1.redemption.id}/settle`, {
            method: 'POST',
            headers: authHeaders(adminToken),
            body: JSON.stringify({ action: 'RETRY' }),
          }),
          routeParams(body1.redemption.id)
        );

      // Attempts 2 and 3 fail (append-only REDEEM+ADJUST pairs accumulate)
      const res2 = await retry();
      expect(res2.status).toBe(200);
      const res3 = await retry();
      expect(res3.status).toBe(200);

      const payouts = await db.select().from(payoutRecords);
      expect(payouts.length).toBe(3);
      const rowsBefore = await db.select().from(creditTxns).where(eq(creditTxns.user_id, user.id));

      // Attempt 4 is beyond MAX_PAYOUT_ATTEMPTS: refused with 409 BEFORE any
      // gateway call or ledger write — zero new rows, redemption stays FAILED.
      const res4 = await retry();
      expect(res4.status).toBe(409);
      const body4 = await res4.json();
      expect(body4.error).toMatch(/payout attempts/i);

      const rowsAfter = await db.select().from(creditTxns).where(eq(creditTxns.user_id, user.id));
      expect(rowsAfter.length).toBe(rowsBefore.length);
      expect((await db.select().from(payoutRecords)).length).toBe(3);

      const [redemption] = await db
        .select()
        .from(redemptionRequests)
        .where(eq(redemptionRequests.id, body1.redemption.id));
      expect(redemption.status).toBe('FAILED');
    });
  });

  // =========================================================================
  // 7. MFS SANDBOX VS DEGRADED OFFLINE MODE
  // =========================================================================
  describe('7. MFS Gateway Sandbox vs Degraded Offline Mode', () => {
    it('marks simulated offline transfer when credentials are absent', async () => {
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 100, reason: 'Initial balance' }),
        })
      );

      const res = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 80,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );
      const body = await res.json();
      expect(body.isSimulated).toBe(true);
      expect(body.payout.gateway_ref).toMatch(/^MFS-SIM-/);
      expect(body.payout.status).toBe('SIMULATED');
    });

    it('uses sandbox credentials and stores provider reference when configured', async () => {
      process.env.SSLCOMMERZ_STORE_ID = 'test_store_123';
      process.env.SSLCOMMERZ_STORE_PASSWD = 'test_password_xyz';

      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 100, reason: 'Initial balance' }),
        })
      );

      const res = await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 80,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );
      const body = await res.json();
      expect(body.isSimulated).toBe(false);
      expect(body.payout.gateway_ref).toMatch(/^MFS-SSL-/);
      expect(body.payout.status).toBe('SUCCESS');
    });
  });

  // =========================================================================
  // 8. LIABILITY DERIVATION & DYNAMIC CAPS AUDIT
  // =========================================================================
  describe('8. Liability Derivation & Dynamic Caps Audit (A11)', () => {
    it('derives outstanding liability accurately from ledger and tracks cap version history', async () => {
      // 1. User 1 earns 500 verified credits
      await adjustWallet(
        new Request('http://localhost/api/v1/admin/wallet/adjust', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ userId: user.id, amount: 500, reason: 'Verified earnings' }),
        })
      );

      // 2. User 1 redeems 200 credits
      await requestRedemptionRoute(
        new Request('http://localhost/api/v1/wallet/redemptions', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            amountCredits: 200,
            payoutChannel: 'BKASH',
            accountNumber: '01711223344',
          }),
        })
      );

      // 3. Admin checks liability summary
      const liabRes = await getLiabilityRoute(
        new Request('http://localhost/api/v1/admin/wallet/liability', {
          headers: authHeaders(adminToken),
        })
      );
      expect(liabRes.status).toBe(200);
      const liabData = await liabRes.json();

      expect(liabData.summary.totalEarnedVerifiedCredits).toBe(500);
      expect(liabData.summary.totalRedeemedCredits).toBe(200);
      expect(liabData.summary.outstandingLiabilityBdt).toBe(300); // 500 - 200
      expect(liabData.summary.currentMonthRedeemedBdt).toBe(200);

      // 4. Admin updates liability caps
      const updateCapRes = await updateLiabilityRoute(
        new Request('http://localhost/api/v1/admin/wallet/liability', {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            monthlyPlatformCapBdt: 250000,
            monthlyUserCapBdt: 10000,
            minRedemptionBdt: 100,
            feePercentage: 2.0,
          }),
        })
      );
      expect(updateCapRes.status).toBe(200);

      // 5. Verify caps history contains the record with admin updated_by
      const historyRes = await getLiabilityRoute(
        new Request('http://localhost/api/v1/admin/wallet/liability', {
          headers: authHeaders(adminToken),
        })
      );
      const historyData = await historyRes.json();
      expect(historyData.activeCaps.monthly_platform_cap_bdt).toBe(250000);
      expect(historyData.activeCaps.fee_percentage).toBe(2);
      expect(historyData.capsHistory.length).toBeGreaterThanOrEqual(1);
      expect(historyData.capsHistory[0].updated_by).toBe(admin.id);
    });
  });
});
