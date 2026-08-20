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
      // Step A: Seed earned credit through deposit & Trust Gate auto-clear
      const custodyRef = `CUSTODY-DEP-${crypto.randomUUID().slice(0, 8)}`;
      const [earnTxn] = await db
        .insert(creditTxns)
        .values({
          user_id: user.id,
          amount: '150.00',
          kind: 'EARN',
          status: 'PENDING',
          custody_ref: custodyRef,
        })
        .returning();

      // Evaluate Trust Gate
      const gateRes = await evaluateTrustGateRoute(
        new Request('http://localhost/api/v1/trust-gate/evaluate', {
          method: 'POST',
          headers: authHeaders(userToken),
          body: JSON.stringify({
            subjectType: 'DEPOSIT',
            subjectId: crypto.randomUUID(),
            userId: user.id,
            category: 'PLASTICS',
            declaredQuantity: 10,
            verifiedQuantity: 10,
            unit: 'kg',
            isSessionValid: true,
            creditTxnId: earnTxn.id,
            custodyRef,
          }),
        })
      );
      expect(gateRes.status).toBe(200);

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
