// SPEC 12: Trust Gate Core, pHash Engine & Dynamic Thresholds (Ticket 08a / Sadat SKD)
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
  trustThresholdConfigs,
  evidenceHashes,
  eq,
} from '@chokro/db';
import {
  TrustGateDomain,
  hammingDistance,
  computeDHash,
  isNearDuplicate,
  isAuditSampled,
} from '../lib/domain/TrustGateDomain';
import { CreditVerificationDomain } from '../lib/domain/CreditVerificationDomain';
import { POST as evaluateGateRoute } from '../app/api/v1/trust-gate/evaluate/route';
import {
  GET as getThresholdsRoute,
  PUT as updateThresholdsRoute,
} from '../app/api/v1/admin/trust-gate/thresholds/route';
import { GET as getWalletBalance } from '../app/api/wallet/balance/route';
import {
  authHeaders,
  createTestUser,
  resetTestStore,
  tokenFor,
} from './test-utils';
import type { TrustSubject } from '@chokro/shared';

describe('SPEC 12: Trust Gate Core & Dynamic Thresholds (Ticket 08a)', () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let admin: Awaited<ReturnType<typeof createTestUser>>;
  let partnerUser: Awaited<ReturnType<typeof createTestUser>>;
  let userToken: string;
  let adminToken: string;
  let partnerToken: string;

  beforeEach(async () => {
    await resetTestStore();
    user = await createTestUser('INDIVIDUAL', 'student@campus.ac.bd');
    admin = await createTestUser('ADMIN', 'admin@chokro.org');
    partnerUser = await createTestUser('PARTNER', 'partner@recycler.com');
    userToken = tokenFor(user);
    adminToken = tokenFor(admin);
    partnerToken = tokenFor(partnerUser);
  });

  // =========================================================================
  // 1. PURE GATE TRUTH TABLE (Unit Seam)
  // =========================================================================
  describe('1. Pure Gate Truth Table (Unit Verification)', () => {
    const baseCleanSubject: TrustSubject = {
      subjectType: 'DEPOSIT',
      subjectId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      category: 'PLASTICS',
      declaredQuantity: 10,
      verifiedQuantity: 9.8,
      unit: 'kg',
      inAppCaptured: true,
      isSessionValid: true,
      userDailyDepositCount: 1,
      userDailyCreditBdt: 450,
      partnerDailyConfirmationCount: 5,
      pairDailyInteractionCount: 1,
      accountCreatedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000), // 30 days old
      estimatedBdt: 450,
      activeFraudFlagCount: 0,
      visionDetectedCategory: 'PLASTICS',
      visionAvailable: true,
    };

    it('auto-clears when all signals pass', () => {
      const result = TrustGateDomain.evaluate(baseCleanSubject);
      expect(result.decision).toBe('AUTO_CLEAR');
      expect(result.failingSignals).toEqual([]);
      expect(result.evaluatedSignals.in_app_capture.passed).toBe(true);
      expect(result.evaluatedSignals.location_or_session.passed).toBe(true);
      expect(result.evaluatedSignals.category_match.passed).toBe(true);
      expect(result.evaluatedSignals.quantity_within_band.passed).toBe(true);
    });

    it('escalates on in_app_capture failure (gallery upload)', () => {
      const subject: TrustSubject = { ...baseCleanSubject, inAppCaptured: false };
      const result = TrustGateDomain.evaluate(subject);
      expect(result.decision).toBe('ESCALATE');
      expect(result.failingSignals).toContain('in_app_capture');
    });

    it('escalates on location failure when outside geofence with no session', () => {
      const subject: TrustSubject = {
        ...baseCleanSubject,
        isSessionValid: false,
        userLocation: { lat: 23.775, lng: 90.426 },
        zoneLocation: { lat: 24.894, lng: 91.868 }, // Far away (~150km)
      };
      const result = TrustGateDomain.evaluate(subject);
      expect(result.decision).toBe('ESCALATE');
      expect(result.failingSignals).toContain('location_or_session');
    });

    it('passes location check if either valid session OR geofence matches', () => {
      // No session, but within 50m of zone
      const subject: TrustSubject = {
        ...baseCleanSubject,
        isSessionValid: false,
        userLocation: { lat: 23.7741, lng: 90.4251 },
        zoneLocation: { lat: 23.774, lng: 90.425 },
      };
      const result = TrustGateDomain.evaluate(subject);
      expect(result.decision).toBe('AUTO_CLEAR');
      expect(result.evaluatedSignals.location_or_session.passed).toBe(true);
    });

    it('escalates on category mismatch between declared and vision classifier', () => {
      const subject: TrustSubject = {
        ...baseCleanSubject,
        category: 'METAL',
        visionDetectedCategory: 'PAPER',
      };
      const result = TrustGateDomain.evaluate(subject);
      expect(result.decision).toBe('ESCALATE');
      expect(result.failingSignals).toContain('category_match');
    });

    it('escalates when vision service is unavailable (inverted fallback rule)', () => {
      const subject: TrustSubject = {
        ...baseCleanSubject,
        visionAvailable: false,
      };
      const result = TrustGateDomain.evaluate(subject);
      expect(result.decision).toBe('ESCALATE');
      expect(result.failingSignals).toContain('category_match');
      expect(result.evaluatedSignals.category_match.available).toBe(false);
    });

    it('escalates on high quantity divergence exceeding tolerance threshold', () => {
      // Declared 10 kg, scale verified 5 kg (50% divergence > 25% default threshold)
      const subject: TrustSubject = {
        ...baseCleanSubject,
        declaredQuantity: 10,
        verifiedQuantity: 5,
      };
      const result = TrustGateDomain.evaluate(subject);
      expect(result.decision).toBe('ESCALATE');
      expect(result.failingSignals).toContain('quantity_within_band');
    });

    it('escalates on user deposit velocity breach', () => {
      const subject: TrustSubject = {
        ...baseCleanSubject,
        userDailyDepositCount: 15, // default cap is 10
      };
      const result = TrustGateDomain.evaluate(subject);
      expect(result.decision).toBe('ESCALATE');
      expect(result.failingSignals).toContain('user_velocity');
    });

    it('escalates on partner confirmation velocity breach', () => {
      const subject: TrustSubject = {
        ...baseCleanSubject,
        partnerDailyConfirmationCount: 60, // default cap is 50
      };
      const result = TrustGateDomain.evaluate(subject);
      expect(result.decision).toBe('ESCALATE');
      expect(result.failingSignals).toContain('partner_velocity');
    });

    it('escalates on pair collusion interaction velocity breach', () => {
      const subject: TrustSubject = {
        ...baseCleanSubject,
        pairDailyInteractionCount: 8, // default cap is 5
      };
      const result = TrustGateDomain.evaluate(subject);
      expect(result.decision).toBe('ESCALATE');
      expect(result.failingSignals).toContain('pair_history');
    });

    it('escalates on new account making large claim', () => {
      const subject: TrustSubject = {
        ...baseCleanSubject,
        accountCreatedAt: new Date(Date.now() - 2 * 3600 * 1000), // 2 hours old
        estimatedBdt: 2500, // > 1000 threshold
      };
      const result = TrustGateDomain.evaluate(subject);
      expect(result.decision).toBe('ESCALATE');
      expect(result.failingSignals).toContain('account_age');
    });

    it('escalates when active fraud flags exceed threshold', () => {
      const subject: TrustSubject = {
        ...baseCleanSubject,
        activeFraudFlagCount: 3, // default threshold is 2
      };
      const result = TrustGateDomain.evaluate(subject);
      expect(result.decision).toBe('ESCALATE');
      expect(result.failingSignals).toContain('flag_count');
    });

    it('reports multiple failing signal names when multiple checks fail simultaneously', () => {
      const subject: TrustSubject = {
        ...baseCleanSubject,
        inAppCaptured: false,
        category: 'METAL',
        visionDetectedCategory: 'PLASTICS',
        userDailyDepositCount: 20,
      };
      const result = TrustGateDomain.evaluate(subject);
      expect(result.decision).toBe('ESCALATE');
      expect(result.failingSignals).toEqual(
        expect.arrayContaining(['in_app_capture', 'category_match', 'user_velocity'])
      );
    });

    it('E_WASTE unconditionally escalates with e_waste_mandatory_review even with perfect signals', () => {
      const subject: TrustSubject = {
        ...baseCleanSubject,
        category: 'E_WASTE',
        visionDetectedCategory: 'E_WASTE',
      };
      const result = TrustGateDomain.evaluate(subject);
      expect(result.decision).toBe('ESCALATE');
      expect(result.failingSignals).toContain('e_waste_mandatory_review');
    });
  });

  // =========================================================================
  // 2. PERCEPTUAL HASHING & HAMMING DISTANCE (dHash Engine)
  // =========================================================================
  describe('2. Perceptual Hashing & Hamming Distance Engine', () => {
    it('calculates exact Hamming distance between hex strings', () => {
      // Identical hashes
      expect(hammingDistance('ffff0000ffff0000', 'ffff0000ffff0000')).toBe(0);

      // Differing by 1 bit: 0xf (1111) vs 0xe (1110)
      expect(hammingDistance('ffff0000ffff0000', 'efff0000ffff0000')).toBe(1);

      // Differing by 4 bits: 0xf (1111) vs 0x0 (0000)
      expect(hammingDistance('ffff0000ffff0000', '0fff0000ffff0000')).toBe(4);

      // Completely inverted 64-bit hash
      expect(hammingDistance('0000000000000000', 'ffffffffffffffff')).toBe(64);
    });

    it('detects near duplicates within configured Hamming threshold', () => {
      const original = 'a1b2c3d4e5f60718';
      const croppedOrShifted = 'a1b2c3d4e5f60719'; // 1 bit diff

      expect(isNearDuplicate(original, croppedOrShifted, 10)).toBe(true);

      const distinct = '00000000ffffffff';
      expect(isNearDuplicate(original, distinct, 10)).toBe(false);
    });

    it('computes deterministic perceptual hash from buffer', async () => {
      const buf1 = Buffer.from('test-image-binary-stream-sample-1');
      const buf2 = Buffer.from('test-image-binary-stream-sample-1');
      const buf3 = Buffer.from('different-image-content-data-2');

      const hash1 = await computeDHash(buf1);
      const hash2 = await computeDHash(buf2);
      const hash3 = await computeDHash(buf3);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThanOrEqual(16);
      expect(hash1).not.toBe(hash3);
    });

    it('performs deterministic audit sampling via decision ID hash', () => {
      const sampleRate = 0.2; // 20%
      const decision1 = 'a0000000-0000-0000-0000-000000000001';
      const decision2 = 'f0000000-0000-0000-0000-000000000002';

      // Same ID always produces same sampling decision
      const sample1a = isAuditSampled(decision1, sampleRate);
      const sample1b = isAuditSampled(decision1, sampleRate);
      expect(sample1a).toBe(sample1b);

      // Zero rate never samples, 100% rate always samples
      expect(isAuditSampled(decision1, 0)).toBe(false);
      expect(isAuditSampled(decision2, 0)).toBe(false);
      expect(isAuditSampled(decision1, 1)).toBe(true);
      expect(isAuditSampled(decision2, 1)).toBe(true);
    });
  });

  // =========================================================================
  // 3. API EVALUATE ROUTE & CREDIT FLIPPING (Route Seam)
  // =========================================================================
  describe('3. POST /api/v1/trust-gate/evaluate', () => {
    it('AUTO_CLEAR flips pending credit to VERIFIED and records trust_decision_id', async () => {
      // 1. Seed pending credit via single owner (replaces hand-seeded CUSTODY-DEP- fallback)
      const depositId = crypto.randomUUID();
      const credit = await CreditVerificationDomain.mintPending({
        userId: user.id,
        amount: 400,
        kind: 'DEPOSIT',
        subjectId: depositId,
      });

      // 2. Initial wallet balance has 0 verified, 400 pending
      const initBalanceRes = await getWalletBalance(
        new Request('http://localhost/api/v1/wallet/balance', {
          headers: authHeaders(userToken),
        })
      );
      const initBalance = await initBalanceRes.json();
      expect(initBalance.balance.verified).toBe(0);
      expect(initBalance.balance.pending).toBe(400);

      // 3. Call Trust Gate evaluate with clean signals via domain (server-assembled; route is admin-only)
      const evalBody = await TrustGateDomain.evaluateAndApply(
        {
          subjectType: 'DEPOSIT',
          subjectId: depositId,
          userId: user.id,
          category: 'PLASTICS',
          declaredQuantity: 8,
          verifiedQuantity: 8,
          unit: 'kg',
          inAppCaptured: true,
          isSessionValid: true,
          evidenceUrl: 'https://evidence.chokro.org/deposit-clean-photo.jpg',
          evidencePhash: '1122334455667788',
        } as any,
        { userId: admin.id, role: 'ADMIN' }
      );

      expect(evalBody.decision).toBe('AUTO_CLEAR');
      expect(evalBody.failingSignals).toEqual([]);
      expect(evalBody.creditStatus).toBe('VERIFIED');
      expect(evalBody.trustDecisionId).toBeDefined();

      // 4. Verify DB: creditTxns row status is VERIFIED and trust_decision_id matches
      const [updatedCredit] = await db
        .select()
        .from(creditTxns)
        .where(eq(creditTxns.id, credit.id));
      expect(updatedCredit.status).toBe('VERIFIED');
      expect(updatedCredit.trust_decision_id).toBe(evalBody.trustDecisionId);

      // 5. Verify DB: trust_decisions record was persisted
      const [decisionRow] = await db
        .select()
        .from(trustDecisions)
        .where(eq(trustDecisions.id, evalBody.trustDecisionId));
      expect(decisionRow).toBeDefined();
      expect(decisionRow.decision).toBe('AUTO_CLEAR');
      expect(decisionRow.subject_id).toBe(depositId);

      // 6. Verify DB: evidence_hashes was recorded
      const [savedHash] = await db
        .select()
        .from(evidenceHashes)
        .where(eq(evidenceHashes.evidence_url, 'https://evidence.chokro.org/deposit-clean-photo.jpg'));
      expect(savedHash).toBeDefined();
      expect(savedHash.phash_hex).toBe('1122334455667788');

      // 7. Verify wallet balance: now 400 verified, 0 pending
      const newBalanceRes = await getWalletBalance(
        new Request('http://localhost/api/v1/wallet/balance', {
          headers: authHeaders(userToken),
        })
      );
      const newBalance = await newBalanceRes.json();
      expect(newBalance.balance.verified).toBe(400);
      expect(newBalance.balance.pending).toBe(0);
    });

    it('ESCALATE leaves credit PENDING and records decision with failing signal names', async () => {
      const depositId = crypto.randomUUID();
      const credit = await CreditVerificationDomain.mintPending({
        userId: user.id,
        amount: 500,
        kind: 'DEPOSIT',
        subjectId: depositId,
      });

      // Submit deposit with high divergence (declared 20kg, verified 5kg) via domain
      const evalBody = await TrustGateDomain.evaluateAndApply(
        {
          subjectType: 'DEPOSIT',
          subjectId: depositId,
          userId: user.id,
          category: 'PLASTICS',
          declaredQuantity: 20,
          verifiedQuantity: 5,
          unit: 'kg',
          isSessionValid: true,
        } as any,
        { userId: admin.id, role: 'ADMIN' }
      );

      expect(evalBody.decision).toBe('ESCALATE');
      expect(evalBody.failingSignals).toContain('quantity_within_band');
      expect(evalBody.creditStatus).toBe('PENDING');

      // Verify DB: credit transaction is STILL PENDING
      const [unverifiedCredit] = await db
        .select()
        .from(creditTxns)
        .where(eq(creditTxns.id, credit.id));
      expect(unverifiedCredit.status).toBe('PENDING');

      // Verify DB: fraud_flags recorded for user
      const flags = await db
        .select()
        .from(fraudFlags)
        .where(eq(fraudFlags.entity_id, user.id));
      expect(flags.length).toBeGreaterThanOrEqual(1);
      expect(flags[0].flag_type).toBe('QUANTITY_DIVERGENCE');
    });

    it('trust bypass fix: non-admin cannot evaluate trust gate and caller signals are ignored', async () => {
      const depositId = crypto.randomUUID();
      await CreditVerificationDomain.mintPending({
        userId: user.id,
        amount: 100,
        kind: 'DEPOSIT',
        subjectId: depositId,
      });
      // Individual tries to call admin-only route with forged signals
      const bypassReq = new Request('http://localhost/api/v1/trust-gate/evaluate', {
        method: 'POST',
        headers: authHeaders(userToken),
        body: JSON.stringify({
          subjectType: 'DEPOSIT',
          subjectId: depositId,
          signals: { quantity_within_band: { available: true, passed: true } },
          activeFraudFlagCount: 0,
        }),
      });
      const bypassRes = await evaluateGateRoute(bypassReq);
      expect(bypassRes.status).toBe(403);

      // Admin calling with forged passing signals still escalates on real divergence (server-derived)
      const evalBody = await TrustGateDomain.evaluateAndApply(
        {
          subjectType: 'DEPOSIT',
          subjectId: depositId,
          userId: user.id,
          category: 'PLASTICS',
          declaredQuantity: 20,
          verifiedQuantity: 5,
          unit: 'kg',
          isSessionValid: true,
        } as any,
        { userId: admin.id, role: 'ADMIN' }
      );
      expect(evalBody.decision).toBe('ESCALATE');
      expect(evalBody.failingSignals).toContain('quantity_within_band');
    });

    it('catches duplicate photo submission via perceptual hash collision and raises fraud flag', async () => {
      // 1. Seed existing evidence hash in DB
      const existingPhash = 'a1b2c3d4e5f60718';
      await db.insert(evidenceHashes).values({
        evidence_url: 'https://evidence.chokro.org/first-deposit.jpg',
        phash_hex: existingPhash,
        uploader_id: user.id,
      });

      // 2. Submit new deposit with cropped photo (Hamming distance = 1 bit diff) via domain (route is admin-only)
      const croppedPhash = 'a1b2c3d4e5f60719';
      const evalBody = await TrustGateDomain.evaluateAndApply(
        {
          subjectType: 'DEPOSIT',
          subjectId: crypto.randomUUID(),
          userId: user.id,
          category: 'PLASTICS',
          declaredQuantity: 5,
          verifiedQuantity: 5,
          unit: 'kg',
          isSessionValid: true,
          evidenceUrl: 'https://evidence.chokro.org/second-deposit-crop.jpg',
          evidencePhash: croppedPhash,
        } as any,
        { userId: admin.id, role: 'ADMIN' }
      );

      expect(evalBody.decision).toBe('ESCALATE');
      expect(evalBody.failingSignals).toContain('hash_unique');

      // Verify fraud flag was raised
      const flags = await db
        .select()
        .from(fraudFlags)
        .where(eq(fraudFlags.entity_id, user.id));
      const duplicateFlag = flags.find((f) => f.flag_type === 'DUPLICATE_PHOTO');
      expect(duplicateFlag).toBeDefined();
      expect(duplicateFlag?.severity).toBe('HIGH');
    });

    it('E_WASTE deposits always escalate with e_waste_mandatory_review', async () => {
      const evalBody = await TrustGateDomain.evaluateAndApply(
        {
          subjectType: 'DEPOSIT',
          subjectId: crypto.randomUUID(),
          userId: user.id,
          category: 'E_WASTE',
          declaredQuantity: 1,
          verifiedQuantity: 1,
          unit: 'piece',
          isSessionValid: true,
          inAppCaptured: true,
        } as any,
        { userId: admin.id, role: 'ADMIN' }
      );

      expect(evalBody.decision).toBe('ESCALATE');
      expect(evalBody.failingSignals).toContain('e_waste_mandatory_review');
    });
  });

  // =========================================================================
  // 4. DYNAMIC THRESHOLDS ADMINISTRATION (GET / PUT / Audit History)
  // =========================================================================
  describe('4. Dynamic Thresholds Administration (GET & PUT /api/v1/admin/trust-gate/thresholds)', () => {
    it('returns default thresholds and empty history on clean start', async () => {
      const req = new Request('http://localhost/api/v1/admin/trust-gate/thresholds', {
        headers: authHeaders(adminToken),
      });
      const res = await getThresholdsRoute(req);
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.thresholds).toMatchObject({
        max_photo_hamming_distance: 10,
        max_quantity_divergence_ratio: 0.25,
        geofence_radius_meters: 200,
        max_user_daily_deposits: 10,
        audit_sample_rate: 0.05,
      });
      expect(body.history).toEqual([]);
    });

    it('updates thresholds, records audit history with admin ID, and alters gate evaluation behavior', async () => {
      // 1. Update thresholds: tighten divergence ratio from 0.25 to 0.05 (5%)
      const updateReq = new Request('http://localhost/api/v1/admin/trust-gate/thresholds', {
        method: 'PUT',
        headers: authHeaders(adminToken),
        body: JSON.stringify({
          max_quantity_divergence_ratio: 0.05, // Tightened to 5%
          max_user_daily_deposits: 3,
        }),
      });

      const updateRes = await updateThresholdsRoute(updateReq);
      expect(updateRes.status).toBe(200);
      const updateBody = await updateRes.json();
      expect(updateBody.thresholds.max_quantity_divergence_ratio).toBe(0.05);
      expect(updateBody.thresholds.max_user_daily_deposits).toBe(3);

      // 2. Fetch thresholds and assert audit history contains record with admin user ID
      const getReq = new Request('http://localhost/api/v1/admin/trust-gate/thresholds', {
        headers: authHeaders(adminToken),
      });
      const getRes = await getThresholdsRoute(getReq);
      const getBody = await getRes.json();
      expect(getBody.history.length).toBe(1);
      expect(getBody.history[0].updated_by).toBe(admin.id);
      expect(getBody.history[0].config_json.max_quantity_divergence_ratio).toBe(0.05);

      // 3. Evaluate a deposit with 10% divergence via domain (route is admin-only):
      // Under old 25% threshold it would have passed; under new 5% threshold it must ESCALATE!
      const evalBody2 = await TrustGateDomain.evaluateAndApply(
        {
          subjectType: 'DEPOSIT',
          subjectId: crypto.randomUUID(),
          userId: user.id,
          category: 'PLASTICS',
          declaredQuantity: 10,
          verifiedQuantity: 9, // 10% divergence
          unit: 'kg',
          isSessionValid: true,
        } as any,
        { userId: admin.id, role: 'ADMIN' }
      );
      expect(evalBody2.decision).toBe('ESCALATE');
      expect(evalBody2.failingSignals).toContain('quantity_within_band');
    });

    it('rejects non-admin users from viewing or updating thresholds', async () => {
      const getReq = new Request('http://localhost/api/v1/admin/trust-gate/thresholds', {
        headers: authHeaders(userToken), // INDIVIDUAL role
      });
      const getRes = await getThresholdsRoute(getReq);
      expect(getRes.status).toBe(403);

      const putReq = new Request('http://localhost/api/v1/admin/trust-gate/thresholds', {
        method: 'PUT',
        headers: authHeaders(userToken),
        body: JSON.stringify({ max_user_daily_deposits: 1 }),
      });
      const putRes = await updateThresholdsRoute(putReq);
      expect(putRes.status).toBe(403);
    });
  });
});
