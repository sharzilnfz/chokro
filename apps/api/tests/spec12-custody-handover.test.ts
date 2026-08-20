// SPEC 12: Custody Handover OTP, Admin Escalation Worklist & Flag Gating (Ticket 08b)
import crypto from 'crypto';
import {
  db,
  creditTxns,
  depositRecords,
  pickupOrders,
  partners,
  trustDecisions,
  fraudFlags,
  custodyHandovers,
  decisionContests,
  eq,
} from '@chokro/db';
import { HandoverDomain } from '../lib/domain/HandoverDomain';
import { PickupDomain } from '../lib/domain/PickupDomain';
import { TrustGateDomain } from '../lib/domain/TrustGateDomain';
import { partnerRepo } from '../lib/repos/partners';
import { POST as generateHandoverRoute } from '../app/api/v1/handovers/generate/route';
import { POST as verifyOtpRoute } from '../app/api/v1/handovers/verify-otp/route';
import { GET as getEscalationsRoute } from '../app/api/v1/admin/trust-gate/escalations/route';
import { POST as adjudicateRoute } from '../app/api/v1/admin/trust-gate/[id]/adjudicate/route';
import { POST as contestRoute } from '../app/api/v1/trust-gate/contest/route';
import { POST as createListingRoute } from '../app/api/listings/route';
import { POST as bookPickupRoute } from '../app/api/pickups/route';
import { GET as getWalletBalanceRoute } from '../app/api/wallet/balance/route';
import {
  authHeaders,
  createTestUser,
  resetTestStore,
  routeParams,
  tokenFor,
} from './test-utils';

const DHAKA = { lat: 23.7806, lng: 90.4192 };

async function createCollectorPartner(opts: {
  org: string;
  baseLat: number;
  baseLng: number;
  radiusKm?: number;
  capacityKg?: number | null;
  licensed?: boolean;
}) {
  const user = await createTestUser('PARTNER', `${crypto.randomUUID()}@collector.test.chokro.org`);
  const partner = await partnerRepo.apply({
    user_id: user.id,
    org_name: opts.org,
    types: ['COLLECTOR'],
    e_waste_licensed: opts.licensed ?? false,
    doe_license_doc: opts.licensed ? 'DOE-TEST-LICENCE.pdf' : null,
    status: 'VERIFIED',
  });
  await db
    .update(partners)
    .set({
      vehicle_label: 'Pickup van',
      vehicle_capacity_kg: opts.capacityKg != null ? String(opts.capacityKg) : null,
      base_lat: opts.baseLat,
      base_lng: opts.baseLng,
      service_radius_km: opts.radiusKm ?? 10,
    })
    .where(eq(partners.id, partner.id));
  return { user, partner };
}

describe('SPEC 12: Custody Handover OTP, Admin Worklist & Flag Gating (Ticket 08b)', () => {
  let customerUser: Awaited<ReturnType<typeof createTestUser>>;
  let adminUser: Awaited<ReturnType<typeof createTestUser>>;
  let customerToken: string;
  let adminToken: string;

  beforeEach(async () => {
    await resetTestStore();
    delete process.env.MAPBOX_TOKEN;
    customerUser = await createTestUser('INDIVIDUAL', 'customer@campus.ac.bd');
    adminUser = await createTestUser('ADMIN', 'admin@chokro.org');
    customerToken = tokenFor(customerUser);
    adminToken = tokenFor(adminUser);
  });

  // =========================================================================
  // 1. TWO-SIDED OTP CUSTODY HANDOVER
  // =========================================================================
  describe('1. Two-Sided OTP Custody Handshake', () => {
    it('generates 6-digit OTP challenge code with 15m expiration, securely hashed', async () => {
      const collector = await createCollectorPartner({
        org: 'Green Haulers',
        baseLat: DHAKA.lat,
        baseLng: DHAKA.lng,
        capacityKg: 500,
      });

      // Create listing & book pickup
      const listingRes = await createListingRoute(
        new Request('http://localhost/api/listings', {
          method: 'POST',
          headers: authHeaders(customerToken),
          body: JSON.stringify({
            category: 'PLASTICS',
            unit: 'kg',
            declaredWeight: 10,
            declaredCondition: 'GOOD',
          }),
        })
      );
      const listing = (await listingRes.json()).listing;

      const bookRes = await bookPickupRoute(
        new Request('http://localhost/api/pickups', {
          method: 'POST',
          headers: authHeaders(customerToken),
          body: JSON.stringify({
            listingId: listing.id,
            address: 'House 15, Road 7, Dhanmondi, Dhaka',
            lat: DHAKA.lat,
            lng: DHAKA.lng,
            scheduledFor: new Date(Date.now() + 3600_000).toISOString(),
          }),
        })
      );
      const pickup = (await bookRes.json()).pickup;

      // Generate handover challenge code
      const genReq = new Request('http://localhost/api/v1/handovers/generate', {
        method: 'POST',
        headers: authHeaders(customerToken),
        body: JSON.stringify({ taskId: pickup.id }),
      });
      const genRes = await generateHandoverRoute(genReq);
      expect(genRes.status).toBe(201);
      const genBody = await genRes.json();

      expect(genBody.otpCode).toBeDefined();
      expect(genBody.otpCode).toHaveLength(6);
      expect(/^\d{6}$/.test(genBody.otpCode)).toBe(true);

      // Verify DB: custody_handovers table contains hashed OTP, never plaintext
      const [handoverRecord] = await db
        .select()
        .from(custodyHandovers)
        .where(eq(custodyHandovers.task_id, pickup.id));

      expect(handoverRecord).toBeDefined();
      expect(handoverRecord.status).toBe('PENDING');
      expect(handoverRecord.giver_user_id).toBe(customerUser.id);
      expect(handoverRecord.collector_partner_id).toBe(collector.partner.id);
      expect(handoverRecord.otp_code_hash).not.toBe(genBody.otpCode);
      expect(handoverRecord.otp_code_hash).toBe(HandoverDomain.hashOtp(genBody.otpCode));

      const expiresMs = new Date(handoverRecord.expires_at).getTime();
      expect(expiresMs).toBeGreaterThan(Date.now());
      expect(expiresMs - Date.now()).toBeLessThanOrEqual(15 * 60 * 1000 + 10000);
      expect(expiresMs - Date.now()).toBeGreaterThan(14 * 60 * 1000);
    });

    it('valid OTP transitions task to COLLECTED, mints green credits, and submits bundle to Trust Gate', async () => {
      const collector = await createCollectorPartner({
        org: 'Green Haulers',
        baseLat: DHAKA.lat,
        baseLng: DHAKA.lng,
        capacityKg: 500,
      });
      const collectorToken = tokenFor(collector.user);

      // Create listing & book pickup
      const listingRes = await createListingRoute(
        new Request('http://localhost/api/listings', {
          method: 'POST',
          headers: authHeaders(customerToken),
          body: JSON.stringify({
            category: 'PLASTICS',
            unit: 'kg',
            declaredWeight: 10,
            declaredCondition: 'GOOD',
          }),
        })
      );
      const listing = (await listingRes.json()).listing;

      const bookRes = await bookPickupRoute(
        new Request('http://localhost/api/pickups', {
          method: 'POST',
          headers: authHeaders(customerToken),
          body: JSON.stringify({
            listingId: listing.id,
            address: 'House 15, Road 7, Dhanmondi, Dhaka',
            lat: DHAKA.lat,
            lng: DHAKA.lng,
            scheduledFor: new Date(Date.now() + 3600_000).toISOString(),
          }),
        })
      );
      const pickup = (await bookRes.json()).pickup;

      // Customer generates OTP challenge
      const genRes = await generateHandoverRoute(
        new Request('http://localhost/api/v1/handovers/generate', {
          method: 'POST',
          headers: authHeaders(customerToken),
          body: JSON.stringify({ taskId: pickup.id }),
        })
      );
      const { otpCode } = await genRes.json();

      // Collector verifies OTP
      const verifyReq = new Request('http://localhost/api/v1/handovers/verify-otp', {
        method: 'POST',
        headers: authHeaders(collectorToken),
        body: JSON.stringify({
          taskId: pickup.id,
          otpCode,
          verifiedQuantity: 10,
          verifiedCondition: 'GOOD',
          notes: 'Material clean and packed properly',
        }),
      });

      const verifyRes = await verifyOtpRoute(verifyReq);
      expect(verifyRes.status).toBe(200);
      const verifyBody = await verifyRes.json();

      expect(verifyBody.success).toBe(true);
      expect(verifyBody.handover.status).toBe('CONFIRMED');
      expect(verifyBody.order.status).toBe('COLLECTED');

      // Verify DB: pickup_orders status is COLLECTED
      const [orderRow] = await db
        .select()
        .from(pickupOrders)
        .where(eq(pickupOrders.id, pickup.id));
      expect(orderRow.status).toBe('COLLECTED');

      // Verify DB: creditTxns row created and auto-cleared/verified
      const [creditRow] = await db
        .select()
        .from(creditTxns)
        .where(eq(creditTxns.custody_ref, `CUSTODY-PICKUP-${pickup.id}`));
      expect(creditRow).toBeDefined();
      expect(creditRow.user_id).toBe(customerUser.id);
      expect(creditRow.status).toBe('VERIFIED');
      expect(creditRow.trust_decision_id).toBeDefined();

      // Verify DB: trust_decisions row created for subject PICKUP
      const [decisionRow] = await db
        .select()
        .from(trustDecisions)
        .where(eq(trustDecisions.subject_id, pickup.id));
      expect(decisionRow).toBeDefined();
      expect(decisionRow.subject_type).toBe('PICKUP');
      expect(decisionRow.decision).toBe('AUTO_CLEAR');

      // Verify wallet balance reflects verified credits
      const balanceRes = await getWalletBalanceRoute(
        new Request('http://localhost/api/v1/wallet/balance', {
          headers: authHeaders(customerToken),
        })
      );
      const balanceBody = await balanceRes.json();
      expect(balanceBody.balance.verified).toBeGreaterThan(0);
    });

    it('mismatched OTP fails verification, marks handover FAILED, and raises fraud flag on collector', async () => {
      const collector = await createCollectorPartner({
        org: 'Green Haulers',
        baseLat: DHAKA.lat,
        baseLng: DHAKA.lng,
        capacityKg: 500,
      });
      const collectorToken = tokenFor(collector.user);

      const listingRes = await createListingRoute(
        new Request('http://localhost/api/listings', {
          method: 'POST',
          headers: authHeaders(customerToken),
          body: JSON.stringify({
            category: 'PLASTICS',
            unit: 'kg',
            declaredWeight: 5,
            declaredCondition: 'GOOD',
          }),
        })
      );
      const listing = (await listingRes.json()).listing;

      const bookRes = await bookPickupRoute(
        new Request('http://localhost/api/pickups', {
          method: 'POST',
          headers: authHeaders(customerToken),
          body: JSON.stringify({
            listingId: listing.id,
            address: 'House 15, Road 7, Dhanmondi, Dhaka',
            lat: DHAKA.lat,
            lng: DHAKA.lng,
            scheduledFor: new Date(Date.now() + 3600_000).toISOString(),
          }),
        })
      );
      const pickup = (await bookRes.json()).pickup;

      // Customer generates OTP challenge
      await generateHandoverRoute(
        new Request('http://localhost/api/v1/handovers/generate', {
          method: 'POST',
          headers: authHeaders(customerToken),
          body: JSON.stringify({ taskId: pickup.id }),
        })
      );

      // Collector enters WRONG code
      const wrongVerifyReq = new Request('http://localhost/api/v1/handovers/verify-otp', {
        method: 'POST',
        headers: authHeaders(collectorToken),
        body: JSON.stringify({
          taskId: pickup.id,
          otpCode: '000000', // Incorrect
        }),
      });

      const verifyRes = await verifyOtpRoute(wrongVerifyReq);
      expect(verifyRes.status).toBe(500); // Handover error

      // Pickup order must NOT have reached COLLECTED
      const [orderRow] = await db
        .select()
        .from(pickupOrders)
        .where(eq(pickupOrders.id, pickup.id));
      expect(orderRow.status).not.toBe('COLLECTED');

      // Handover status is FAILED
      const [handover] = await db
        .select()
        .from(custodyHandovers)
        .where(eq(custodyHandovers.task_id, pickup.id));
      expect(handover.status).toBe('FAILED');

      // Fraud flag raised on collector partner
      const flags = await db
        .select()
        .from(fraudFlags)
        .where(eq(fraudFlags.entity_id, collector.partner.id));
      expect(flags.length).toBe(1);
      expect(flags[0].flag_type).toBe('OTP_MISMATCH');
      expect(flags[0].severity).toBe('HIGH');
    });

    it('rejects unauthorized users from verifying OTP', async () => {
      const collector = await createCollectorPartner({
        org: 'Green Haulers',
        baseLat: DHAKA.lat,
        baseLng: DHAKA.lng,
        capacityKg: 500,
      });
      const otherUser = await createTestUser('INDIVIDUAL', 'other@campus.ac.bd');
      const otherToken = tokenFor(otherUser);

      const listingRes = await createListingRoute(
        new Request('http://localhost/api/listings', {
          method: 'POST',
          headers: authHeaders(customerToken),
          body: JSON.stringify({
            category: 'PLASTICS',
            unit: 'kg',
            declaredWeight: 5,
            declaredCondition: 'GOOD',
          }),
        })
      );
      const listing = (await listingRes.json()).listing;

      const bookRes = await bookPickupRoute(
        new Request('http://localhost/api/pickups', {
          method: 'POST',
          headers: authHeaders(customerToken),
          body: JSON.stringify({
            listingId: listing.id,
            address: 'House 15, Road 7, Dhanmondi, Dhaka',
            lat: DHAKA.lat,
            lng: DHAKA.lng,
            scheduledFor: new Date(Date.now() + 3600_000).toISOString(),
          }),
        })
      );
      const pickup = (await bookRes.json()).pickup;

      const genRes = await generateHandoverRoute(
        new Request('http://localhost/api/v1/handovers/generate', {
          method: 'POST',
          headers: authHeaders(customerToken),
          body: JSON.stringify({ taskId: pickup.id }),
        })
      );
      const { otpCode } = await genRes.json();

      // Unauthorized user tries to verify
      const unauthVerify = await verifyOtpRoute(
        new Request('http://localhost/api/v1/handovers/verify-otp', {
          method: 'POST',
          headers: authHeaders(otherToken),
          body: JSON.stringify({
            taskId: pickup.id,
            otpCode,
          }),
        })
      );
      expect(unauthVerify.status).toBe(500);
    });
  });

  // =========================================================================
  // 2. ADMIN ESCALATION WORKLIST & ADJUDICATION
  // =========================================================================
  describe('2. Admin Escalation Worklist & Adjudication (A07)', () => {
    it('lists escalated decisions ordered oldest first with signals and flag history', async () => {
      // Create 2 escalated decisions with timestamps
      const [dec1] = await db
        .insert(trustDecisions)
        .values({
          subject_type: 'DEPOSIT',
          subject_id: crypto.randomUUID(),
          decision: 'ESCALATE',
          failing_signals: ['quantity_within_band'],
          evaluated_signals: { user_id: customerUser.id },
          created_at: new Date(Date.now() - 3600_000), // 1 hour ago
        })
        .returning();

      const [dec2] = await db
        .insert(trustDecisions)
        .values({
          subject_type: 'DEPOSIT',
          subject_id: crypto.randomUUID(),
          decision: 'ESCALATE',
          failing_signals: ['hash_unique'],
          evaluated_signals: { user_id: customerUser.id },
          created_at: new Date(Date.now() - 1800_000), // 30 mins ago
        })
        .returning();

      const req = new Request('http://localhost/api/v1/admin/trust-gate/escalations', {
        headers: authHeaders(adminToken),
      });
      const res = await getEscalationsRoute(req);
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.count).toBe(2);
      expect(body.escalations[0].id).toBe(dec1.id); // Older first
      expect(body.escalations[1].id).toBe(dec2.id);
      expect(body.escalations[0].failing_signals).toContain('quantity_within_band');
    });

    it('admin adjudication VERIFY flips credit to VERIFIED', async () => {
      const depositId = crypto.randomUUID();
      const custodyRef = `CUSTODY-DEP-${depositId}`;

      const [credit] = await db
        .insert(creditTxns)
        .values({
          user_id: customerUser.id,
          amount: '750.00',
          kind: 'EARN',
          status: 'PENDING',
          custody_ref: custodyRef,
        })
        .returning();

      const [decision] = await db
        .insert(trustDecisions)
        .values({
          subject_type: 'DEPOSIT',
          subject_id: depositId,
          decision: 'ESCALATE',
          failing_signals: ['quantity_within_band'],
          evaluated_signals: { user_id: customerUser.id },
        })
        .returning();

      // Admin approves
      const adjReq = new Request(
        `http://localhost/api/v1/admin/trust-gate/${decision.id}/adjudicate`,
        {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ action: 'VERIFY' }),
        }
      );

      const adjRes = await adjudicateRoute(adjReq, routeParams(decision.id));
      expect(adjRes.status).toBe(200);
      const adjBody = await adjRes.json();
      expect(adjBody.action).toBe('VERIFIED');

      // Credit status must be VERIFIED
      const [updatedCredit] = await db
        .select()
        .from(creditTxns)
        .where(eq(creditTxns.id, credit.id));
      expect(updatedCredit.status).toBe('VERIFIED');
      expect(updatedCredit.trust_decision_id).toBe(decision.id);
    });

    it('admin adjudication REJECT requires a mandatory explanation reason and marks credit REJECTED', async () => {
      const depositId = crypto.randomUUID();
      const custodyRef = `CUSTODY-DEP-${depositId}`;

      const [credit] = await db
        .insert(creditTxns)
        .values({
          user_id: customerUser.id,
          amount: '750.00',
          kind: 'EARN',
          status: 'PENDING',
          custody_ref: custodyRef,
        })
        .returning();

      const [decision] = await db
        .insert(trustDecisions)
        .values({
          subject_type: 'DEPOSIT',
          subject_id: depositId,
          decision: 'ESCALATE',
          failing_signals: ['hash_unique'],
          evaluated_signals: { user_id: customerUser.id },
        })
        .returning();

      // Reject without reason fails
      const noReasonReq = new Request(
        `http://localhost/api/v1/admin/trust-gate/${decision.id}/adjudicate`,
        {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ action: 'REJECT' }),
        }
      );
      const failRes = await adjudicateRoute(noReasonReq, routeParams(decision.id));
      expect(failRes.status).toBe(400);

      // Reject with valid reason succeeds
      const rejectReq = new Request(
        `http://localhost/api/v1/admin/trust-gate/${decision.id}/adjudicate`,
        {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            action: 'REJECT',
            reason: 'Photo submitted was previously used in another deposit',
          }),
        }
      );
      const adjRes = await adjudicateRoute(rejectReq, routeParams(decision.id));
      expect(adjRes.status).toBe(200);
      const adjBody = await adjRes.json();
      expect(adjBody.action).toBe('REJECTED');
      expect(adjBody.reason).toContain('previously used');

      // Credit status must be REJECTED
      const [updatedCredit] = await db
        .select()
        .from(creditTxns)
        .where(eq(creditTxns.id, credit.id));
      expect(updatedCredit.status).toBe('REJECTED');
      expect(updatedCredit.reason).toContain('previously used');
    });
  });

  // =========================================================================
  // 3. ONE-TIME DECISION CONTEST APPEAL WORKFLOW
  // =========================================================================
  describe('3. One-Time Decision Contest Appeal Workflow', () => {
    it('allows a user to contest a decision once and flags it as second-look in the escalation queue', async () => {
      const [decision] = await db
        .insert(trustDecisions)
        .values({
          subject_type: 'DEPOSIT',
          subject_id: crypto.randomUUID(),
          decision: 'ESCALATE',
          failing_signals: ['category_match'],
          evaluated_signals: { user_id: customerUser.id },
        })
        .returning();

      // User submits contest
      const contestReq = new Request('http://localhost/api/v1/trust-gate/contest', {
        method: 'POST',
        headers: authHeaders(customerToken),
        body: JSON.stringify({
          decisionId: decision.id,
          reason: 'The items are indeed HDPE plastics, not mixed paper as classified.',
        }),
      });

      const contestRes = await contestRoute(contestReq);
      expect(contestRes.status).toBe(201);
      const contestBody = await contestRes.json();

      expect(contestBody.contest.status).toBe('PENDING');
      expect(contestBody.contest.decision_id).toBe(decision.id);

      // Verify worklist flags item as contested (second look)
      const escalations = await HandoverDomain.getEscalationWorklist();
      const queueItem = escalations.find((e) => e.id === decision.id);
      expect(queueItem).toBeDefined();
      expect(queueItem?.is_contested).toBe(true);
      expect(queueItem?.contest?.reason).toContain('HDPE plastics');
    });

    it('rejects subsequent contest attempts on the same decision', async () => {
      const [decision] = await db
        .insert(trustDecisions)
        .values({
          subject_type: 'DEPOSIT',
          subject_id: crypto.randomUUID(),
          decision: 'ESCALATE',
          failing_signals: ['category_match'],
          evaluated_signals: { user_id: customerUser.id },
        })
        .returning();

      // First contest succeeds
      await contestRoute(
        new Request('http://localhost/api/v1/trust-gate/contest', {
          method: 'POST',
          headers: authHeaders(customerToken),
          body: JSON.stringify({
            decisionId: decision.id,
            reason: 'First appeal reason here.',
          }),
        })
      );

      // Second contest fails
      const secondContestRes = await contestRoute(
        new Request('http://localhost/api/v1/trust-gate/contest', {
          method: 'POST',
          headers: authHeaders(customerToken),
          body: JSON.stringify({
            decisionId: decision.id,
            reason: 'Second appeal reason attempt.',
          }),
        })
      );

      expect(secondContestRes.status).toBe(500); // Multiple appeals forbidden
    });
  });

  // =========================================================================
  // 4. PARTNER DISPATCH FRAUD FLAG GATING
  // =========================================================================
  describe('4. Partner Dispatch Fraud Flag Gating', () => {
    it('skips collector partner with active fraud flags exceeding threshold with FLAGGED_FRAUD_RISK', async () => {
      const nearCollector = await createCollectorPartner({
        org: 'Flagged Collector Inc',
        baseLat: DHAKA.lat,
        baseLng: DHAKA.lng,
        capacityKg: 500,
      });

      const farCollector = await createCollectorPartner({
        org: 'Clean Far Collector',
        baseLat: 23.7481,
        baseLng: 90.3765,
        capacityKg: 500,
      });

      // Add 3 active fraud flags to nearCollector (exceeding default max_active_fraud_flags = 2)
      for (let i = 0; i < 3; i++) {
        await db.insert(fraudFlags).values({
          entity_type: 'PARTNER',
          entity_id: nearCollector.partner.id,
          flag_type: 'OTP_MISMATCH',
          reason: `Repeated invalid handover OTP attempt #${i + 1}`,
          severity: 'HIGH',
          is_cleared: false,
        });
      }

      // Find best collector
      const result = await PickupDomain.findBestCollector({
        lat: DHAKA.lat,
        lng: DHAKA.lng,
        weightKg: 10,
        category: 'PLASTICS',
      });

      // Near collector must be skipped with FLAGGED_FRAUD_RISK
      const nearEval = result.runnersUp.find((r) => r.partner_id === nearCollector.partner.id);
      expect(nearEval).toBeDefined();
      expect(nearEval?.eligible).toBe(false);
      expect(nearEval?.skip_reason).toBe('FLAGGED_FRAUD_RISK');

      // Best assigned collector should be the clean far collector
      expect(result.best?.partner.id).toBe(farCollector.partner.id);
    });

    it('re-enables partner eligibility when fraud flags are cleared', async () => {
      const collector = await createCollectorPartner({
        org: 'Rehabilitated Collector',
        baseLat: DHAKA.lat,
        baseLng: DHAKA.lng,
        capacityKg: 500,
      });

      // Add 3 fraud flags
      for (let i = 0; i < 3; i++) {
        await db.insert(fraudFlags).values({
          entity_type: 'PARTNER',
          entity_id: collector.partner.id,
          flag_type: 'OTP_MISMATCH',
          reason: `Flag #${i + 1}`,
          severity: 'HIGH',
          is_cleared: false,
        });
      }

      // Verify skipped
      const initialEval = await PickupDomain.findBestCollector({
        lat: DHAKA.lat,
        lng: DHAKA.lng,
        weightKg: 10,
        category: 'PLASTICS',
      });
      expect(initialEval.runnersUp[0].skip_reason).toBe('FLAGGED_FRAUD_RISK');

      // Clear the flags
      await db
        .update(fraudFlags)
        .set({ is_cleared: true, cleared_by: adminUser.id, cleared_at: new Date() })
        .where(eq(fraudFlags.entity_id, collector.partner.id));

      // Re-evaluate
      const clearedEval = await PickupDomain.findBestCollector({
        lat: DHAKA.lat,
        lng: DHAKA.lng,
        weightKg: 10,
        category: 'PLASTICS',
      });
      expect(clearedEval.best?.partner.id).toBe(collector.partner.id);
      expect(clearedEval.runnersUp[0].eligible).toBe(true);
      expect(clearedEval.runnersUp[0].skip_reason).toBeNull();
    });
  });
});
