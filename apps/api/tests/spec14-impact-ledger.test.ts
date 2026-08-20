// SPEC 14: Impact Ledger, ESG Certificates & Institutional Sponsorship (Ticket 10 / Imran Ahmed Upom m4)
import crypto from 'crypto';
import {
  db,
  campuses,
  users,
  partners,
  dropZones,
  dropSessions,
  depositRecords,
  creditTxns,
  trustDecisions,
  impactRecords,
  emissionFactors,
  institutionAccounts,
  sustainabilityCertificates,
  sponsorshipPools,
  eq,
} from '@chokro/db';
import { ImpactDomain, BASELINE_EMISSION_FACTORS } from '../lib/domain/ImpactDomain';
import { TrustGateDomain } from '../lib/domain/TrustGateDomain';
import { HandoverDomain } from '../lib/domain/HandoverDomain';
import { impactRepo } from '../lib/repos/impact';
import { GET as getPersonalImpactRoute } from '../app/api/v1/impact/personal/route';
import { GET as getInstitutionImpactRoute } from '../app/api/v1/impact/institutions/[id]/route';
import { POST as generateCertificateRoute } from '../app/api/v1/certificates/generate/route';
import { GET as verifyCertificateRoute } from '../app/api/v1/certificates/[ref]/route';
import { GET as getAdminCertificatesRoute } from '../app/api/v1/admin/impact/certificates/route';
import { GET as getAdminEwasteComplianceRoute } from '../app/api/v1/admin/impact/ewaste-compliance/route';
import {
  authHeaders,
  createTestUser,
  resetTestStore,
  tokenFor,
  routeParams,
} from './test-utils';

describe('SPEC 14: Impact Ledger, ESG Certificates & Institutional Sponsorship', () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let unlinkedUser: Awaited<ReturnType<typeof createTestUser>>;
  let admin: Awaited<ReturnType<typeof createTestUser>>;
  let partnerUser: Awaited<ReturnType<typeof createTestUser>>;
  let userToken: string;
  let unlinkedUserToken: string;
  let adminToken: string;
  let partnerToken: string;

  let campusId: string;
  let campusSlug: string;
  let partnerId: string;
  let dropZoneId: string;

  beforeEach(async () => {
    await resetTestStore();

    // 1. Seed verified Campus (BRAC University)
    campusSlug = 'BRACU';
    const [c] = await db
      .insert(campuses)
      .values({
        name: 'BRAC University',
        slug: campusSlug,
        division: 'DHAKA',
        zilla: 'Dhaka',
        upazilla: 'Mohakhali',
        status: 'VERIFIED',
      })
      .returning();
    campusId = c.id;

    // 2. Seed Users
    user = await createTestUser('INDIVIDUAL', 'student@g.bracu.ac.bd', campusSlug);
    unlinkedUser = await createTestUser('INDIVIDUAL', 'independent@gmail.com', null);
    admin = await createTestUser('ADMIN', 'admin@chokro.org', null);
    partnerUser = await createTestUser('PARTNER', 'partner@greendhaka.com', null);

    userToken = tokenFor(user);
    unlinkedUserToken = tokenFor(unlinkedUser);
    adminToken = tokenFor(admin);
    partnerToken = tokenFor(partnerUser);

    // 3. Seed verified Partner with DoE e-waste license
    const [p] = await db
      .insert(partners)
      .values({
        user_id: partnerUser.id,
        org_name: 'Green Dhaka Recyclers Ltd',
        types: ['COLLECTOR', 'RECYCLER'],
        e_waste_licensed: true,
        doe_license_doc: 'DOE-PERMIT-2026-BRACU-01.pdf',
        status: 'VERIFIED',
      })
      .returning();
    partnerId = p.id;

    // 4. Seed Drop Zone bound to campus and licensed partner
    const [z] = await db
      .insert(dropZones)
      .values({
        institution_id: campusSlug,
        name: 'BRACU Building 1 Eco Hub',
        qr_token: 'ZONE-BRACU-01',
        accepted_categories: ['PLASTICS', 'PAPER', 'METAL', 'E_WASTE'],
        status: 'ACTIVE',
        contracted_partner_id: partnerId,
      })
      .returning();
    dropZoneId = z.id;

    // 5. Seed Institution Account for campus
    await db.insert(institutionAccounts).values({
      campus_id: campusId,
      invite_code: 'BRACU2026',
      contact_email: 'sustainability@bracu.ac.bd',
      total_diverted_kg: '0.00',
    });

    // 6. Seed Baseline Emission Factors in DB
    await ImpactDomain.seedBaselineEmissionFactors();
  });

  // =========================================================================
  // 1. IMPACT FOLLOWS VERIFICATION (Not unverified custody)
  // =========================================================================
  describe('1. Impact Derivation on Verification Only', () => {
    it('creates no impact record upon initial deposit submission; creates exactly one upon Trust Gate verification', async () => {
      // 1. User opens deposit session & records deposit (10 kg Plastics)
      const [session] = await db
        .insert(dropSessions)
        .values({
          zone_id: dropZoneId,
          user_id: user.id,
          session_secret: 'sec-123',
          short_code: '123456',
          status: 'OPEN',
          expires_at: new Date(Date.now() + 15 * 60 * 1000),
        })
        .returning();

      const [deposit] = await db
        .insert(depositRecords)
        .values({
          session_id: session.id,
          zone_id: dropZoneId,
          user_id: user.id,
          category: 'PLASTICS',
          unit: 'kg',
          declared_quantity: '10.00',
          evidence_url: 'https://evidence.chokro.org/plastics-10kg.jpg',
          estimated_bdt: '500.00',
          status: 'RECORDED',
        })
        .returning();

      // Assert NO impact record exists before Trust Gate evaluation
      const preImpact = await impactRepo.findImpactRecordByCustodyId(deposit.id);
      expect(preImpact).toBeNull();

      // 2. Trust Gate auto-clears the deposit
      const evalResult = await TrustGateDomain.evaluateAndApply({
        subjectType: 'DEPOSIT',
        subjectId: deposit.id,
        userId: user.id,
        category: 'PLASTICS',
        declaredQuantity: 10,
        verifiedQuantity: 10,
        unit: 'kg',
        inAppCaptured: true,
        isSessionValid: true,
        visionAvailable: true,
      });

      expect(evalResult.decision).toBe('AUTO_CLEAR');

      // 3. Assert EXACTLY ONE impact record exists referencing the custody ID and decision ID
      const postImpact = await impactRepo.findImpactRecordByCustodyId(deposit.id);
      expect(postImpact).not.toBeNull();
      expect(postImpact?.custody_id).toBe(deposit.id);
      expect(postImpact?.trust_decision_id).toBe(evalResult.trustDecisionId);
      expect(postImpact?.user_id).toBe(user.id);
      expect(postImpact?.institution_id).toBe(campusId);
      expect(Number(postImpact?.mass_kg)).toBe(10);
      expect(Number(postImpact?.avoided_co2e_kg)).toBe(14.5); // 10kg * 1.45 kg CO2e/kg (PLASTICS:RECYCLE)
      expect(postImpact?.factor_version).toBe('v1.0');
    });

    it('creates NO impact record for unverified or escalated deposits', async () => {
      const depositId = crypto.randomUUID();

      // Evaluate an escalated subject (e.g. quantity divergence failure)
      const evalResult = await TrustGateDomain.evaluateAndApply({
        subjectType: 'DEPOSIT',
        subjectId: depositId,
        userId: user.id,
        category: 'PLASTICS',
        declaredQuantity: 20,
        verifiedQuantity: 5, // 75% divergence -> ESCALATE
        unit: 'kg',
        inAppCaptured: true,
        isSessionValid: true,
        visionAvailable: true,
      });

      expect(evalResult.decision).toBe('ESCALATE');

      const impact = await impactRepo.findImpactRecordByCustodyId(depositId);
      expect(impact).toBeNull();
    });

    it('enforces uniqueness constraint: duplicate verification calls do not double-count', async () => {
      const depositId = crypto.randomUUID();
      const decisionId = crypto.randomUUID();

      // Seed a Trust Decision
      await db.insert(trustDecisions).values({
        id: decisionId,
        subject_type: 'DEPOSIT',
        subject_id: depositId,
        decision: 'AUTO_CLEAR',
        evaluated_signals: {},
      });

      // First impact record creation
      const record1 = await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: depositId,
        trustDecisionId: decisionId,
        userId: user.id,
        category: 'PLASTICS',
        declaredQuantity: 15,
        verifiedQuantity: 15,
        unit: 'kg',
      });

      // Second duplicate call with identical custodyId
      const record2 = await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: depositId,
        trustDecisionId: decisionId,
        userId: user.id,
        category: 'PLASTICS',
        declaredQuantity: 15,
        verifiedQuantity: 15,
        unit: 'kg',
      });

      expect(record1.id).toBe(record2.id);

      // Verify DB contains exactly 1 row for this custodyId
      const rows = await db
        .select()
        .from(impactRecords)
        .where(eq(impactRecords.custody_id, depositId));
      expect(rows.length).toBe(1);
    });
  });

  // =========================================================================
  // 2. IMMUTABILITY, FACTOR VERSIONING & MISSING FACTOR RULE
  // =========================================================================
  describe('2. Factor Versioning, Immutability & Missing Factor Handling', () => {
    it('freezes factor version on record creation; subsequent factor changes do not mutate historical records', async () => {
      const depositId = crypto.randomUUID();
      const decisionId = crypto.randomUUID();

      await db.insert(trustDecisions).values({
        id: decisionId,
        subject_type: 'DEPOSIT',
        subject_id: depositId,
        decision: 'AUTO_CLEAR',
        evaluated_signals: {},
      });

      // 1. Record impact under factor version v1.0 (PLASTICS:RECYCLE = 1.45)
      const record = await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: depositId,
        trustDecisionId: decisionId,
        userId: user.id,
        category: 'PLASTICS',
        declaredQuantity: 10,
        unit: 'kg',
        effectiveDate: new Date('2026-01-01'),
      });

      expect(Number(record.avoided_co2e_kg)).toBe(14.5);
      expect(record.factor_version).toBe('v1.0');

      // 2. Admin publishes a new factor table version v2.0 with higher factor (2.50) effective 2026-06-01
      await impactRepo.createEmissionFactor({
        category: 'PLASTICS',
        next_life_path: 'RECYCLE',
        factor_co2e_per_kg: '2.5000',
        range_low: '2.1000',
        range_high: '2.9000',
        source: 'ISO 14044 Revised 2026 Update',
        version: 'v2.0',
        effective_from: new Date('2026-06-01'),
      });

      // 3. Re-read historical record: assert it remains strictly unchanged (14.5 kg, v1.0)
      const historical = await impactRepo.findImpactRecordByCustodyId(depositId);
      expect(Number(historical?.avoided_co2e_kg)).toBe(14.5);
      expect(historical?.factor_version).toBe('v1.0');

      // 4. New deposit in late 2026 uses the new v2.0 factor
      const newDepositId = crypto.randomUUID();
      const newDecisionId = crypto.randomUUID();
      await db.insert(trustDecisions).values({
        id: newDecisionId,
        subject_type: 'DEPOSIT',
        subject_id: newDepositId,
        decision: 'AUTO_CLEAR',
        evaluated_signals: {},
      });

      const newRecord = await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: newDepositId,
        trustDecisionId: newDecisionId,
        userId: user.id,
        category: 'PLASTICS',
        declaredQuantity: 10,
        unit: 'kg',
        effectiveDate: new Date('2026-07-01'),
      });

      expect(Number(newRecord.avoided_co2e_kg)).toBe(25.0); // 10 * 2.50
      expect(newRecord.factor_version).toBe('v2.0');
    });

    it('records mass with 0 emissions and factor_version=NONE when category has no published factor (never invents numbers)', async () => {
      const depositId = crypto.randomUUID();
      const decisionId = crypto.randomUUID();

      await db.insert(trustDecisions).values({
        id: decisionId,
        subject_type: 'DEPOSIT',
        subject_id: depositId,
        decision: 'AUTO_CLEAR',
        evaluated_signals: {},
      });

      // Category with no published factor (e.g. UNKNOWN_MATERIAL)
      const record = await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: depositId,
        trustDecisionId: decisionId,
        userId: user.id,
        category: 'UNKNOWN_MATERIAL' as any,
        declaredQuantity: 50,
        unit: 'kg',
      });

      expect(Number(record.mass_kg)).toBe(50);
      expect(Number(record.avoided_co2e_kg)).toBe(0);
      expect(record.factor_version).toBe('NONE');
    });

    it('separates reuse/repair emission factors from raw recycling by order of magnitude', async () => {
      const dep1 = crypto.randomUUID();
      const dep2 = crypto.randomUUID();
      const dec1 = crypto.randomUUID();
      const dec2 = crypto.randomUUID();

      await db.insert(trustDecisions).values([
        { id: dec1, subject_type: 'DEPOSIT', subject_id: dep1, decision: 'AUTO_CLEAR', evaluated_signals: {} },
        { id: dec2, subject_type: 'DEPOSIT', subject_id: dep2, decision: 'AUTO_CLEAR', evaluated_signals: {} },
      ]);

      // Clothes Recycling (3.5 kg CO2e / kg)
      const recycleRecord = await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: dep1,
        trustDecisionId: dec1,
        userId: user.id,
        category: 'CLOTHES',
        declaredQuantity: 10,
        unit: 'kg',
        nextLifePath: 'RECYCLE',
      });

      // Clothes Direct Reuse (15.0 kg CO2e / kg)
      const reuseRecord = await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: dep2,
        trustDecisionId: dec2,
        userId: user.id,
        category: 'CLOTHES',
        declaredQuantity: 10,
        unit: 'kg',
        nextLifePath: 'REUSE',
      });

      expect(Number(recycleRecord.avoided_co2e_kg)).toBe(35); // 10 * 3.5
      expect(Number(reuseRecord.avoided_co2e_kg)).toBe(150); // 10 * 15.0
      expect(Number(reuseRecord.avoided_co2e_kg)).toBeGreaterThan(Number(recycleRecord.avoided_co2e_kg) * 4);
    });
  });

  // =========================================================================
  // 3. PERSONAL & INSTITUTIONAL IMPACT DASHBOARDS (API Routes)
  // =========================================================================
  describe('3. Personal & Institutional Impact Dashboards (GET /api/v1/impact/*)', () => {
    it('GET /api/v1/impact/personal returns personal totals, real-world equivalencies, and breakdown', async () => {
      // Seed 2 verified impact records for user
      const d1 = crypto.randomUUID();
      const d2 = crypto.randomUUID();
      const dec1 = crypto.randomUUID();
      const dec2 = crypto.randomUUID();

      await db.insert(trustDecisions).values([
        { id: dec1, subject_type: 'DEPOSIT', subject_id: d1, decision: 'AUTO_CLEAR', evaluated_signals: {} },
        { id: dec2, subject_type: 'DEPOSIT', subject_id: d2, decision: 'AUTO_CLEAR', evaluated_signals: {} },
      ]);

      await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: d1,
        trustDecisionId: dec1,
        userId: user.id,
        category: 'PLASTICS',
        declaredQuantity: 20,
        unit: 'kg',
        nextLifePath: 'RECYCLE',
      });

      await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: d2,
        trustDecisionId: dec2,
        userId: user.id,
        category: 'METAL',
        declaredQuantity: 10,
        unit: 'kg',
        nextLifePath: 'REUSE',
      });

      const req = new Request('http://localhost/api/v1/impact/personal', {
        headers: authHeaders(userToken),
      });
      const res = await getPersonalImpactRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.totalDivertedKg).toBe(30); // 20 + 10
      expect(body.totalAvoidedCo2eKg).toBe(114); // 20*1.45 (29) + 10*8.5 (85) = 114
      expect(body.comparisons.treeEquivalents).toBeGreaterThan(5);
      expect(body.comparisons.kmDrivenAvoided).toBeGreaterThan(500);
      expect(body.byCategory.length).toBe(2);
      expect(body.byPath.length).toBe(2);
      expect(body.methodologyBasis).toBeDefined();
    });

    it('GET /api/v1/impact/institutions/[id] aggregates linked members and excludes unlinked users', async () => {
      // User 1 is linked to BRACU
      const d1 = crypto.randomUUID();
      const dec1 = crypto.randomUUID();
      await db.insert(trustDecisions).values({ id: dec1, subject_type: 'DEPOSIT', subject_id: d1, decision: 'AUTO_CLEAR', evaluated_signals: {} });
      await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: d1,
        trustDecisionId: dec1,
        userId: user.id,
        category: 'PLASTICS',
        declaredQuantity: 40,
        unit: 'kg',
        institutionId: campusId,
      });

      // User 2 is unlinked (independent)
      const d2 = crypto.randomUUID();
      const dec2 = crypto.randomUUID();
      await db.insert(trustDecisions).values({ id: dec2, subject_type: 'DEPOSIT', subject_id: d2, decision: 'AUTO_CLEAR', evaluated_signals: {} });
      await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: d2,
        trustDecisionId: dec2,
        userId: unlinkedUser.id,
        category: 'PLASTICS',
        declaredQuantity: 100,
        unit: 'kg',
        institutionId: null,
      });

      // Fetch BRACU institution impact
      const req = new Request(`http://localhost/api/v1/impact/institutions/${campusSlug}`);
      const res = await getInstitutionImpactRoute(req, routeParams(campusSlug));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.institution.slug).toBe('BRACU');
      expect(body.totalDivertedKg).toBe(40); // Only User 1's 40 kg, NOT User 2's 100 kg
      expect(body.activeMemberCount).toBe(1);
    });
  });

  // =========================================================================
  // 4. ESG SUSTAINABILITY CERTIFICATE GENERATION & PUBLIC VERIFICATION
  // =========================================================================
  describe('4. ESG Certificates Generation & Public Cryptographic Verification', () => {
    let certRef: string;

    it('generates a frozen certificate with unguessable ref and SHA-256 signature', async () => {
      // Seed 2 verified records in January 2026
      const d1 = crypto.randomUUID();
      const d2 = crypto.randomUUID();
      const dec1 = crypto.randomUUID();
      const dec2 = crypto.randomUUID();

      await db.insert(trustDecisions).values([
        { id: dec1, subject_type: 'DEPOSIT', subject_id: d1, decision: 'AUTO_CLEAR', evaluated_signals: {} },
        { id: dec2, subject_type: 'DEPOSIT', subject_id: d2, decision: 'AUTO_CLEAR', evaluated_signals: {} },
      ]);

      const r1 = await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: d1,
        trustDecisionId: dec1,
        userId: user.id,
        category: 'PAPER',
        declaredQuantity: 50,
        unit: 'kg',
        institutionId: campusId,
        effectiveDate: new Date('2026-01-10'),
      });

      const r2 = await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: d2,
        trustDecisionId: dec2,
        userId: user.id,
        category: 'METAL',
        declaredQuantity: 20,
        unit: 'kg',
        institutionId: campusId,
        effectiveDate: new Date('2026-01-15'),
      });

      // Generate certificate for Jan 1 - Jan 31, 2026
      const genReq = new Request('http://localhost/api/v1/certificates/generate', {
        method: 'POST',
        headers: authHeaders(adminToken),
        body: JSON.stringify({
          institutionId: campusId,
          periodStart: '2026-01-01T00:00:00.000Z',
          periodEnd: '2026-01-31T23:59:59.000Z',
        }),
      });

      const genRes = await generateCertificateRoute(genReq);
      expect(genRes.status).toBe(201);
      const genBody = await genRes.json();

      const cert = genBody.certificate;
      expect(cert.certificate_ref).toMatch(/^CERT-BRACU-2026-[a-f0-9]{8}$/);
      expect(Number(cert.total_mass_kg)).toBe(70); // 50 + 20
      expect(Number(cert.total_co2e_kg)).toBe(131.5); // 50*0.95 (47.5) + 20*4.2 (84) = 131.5
      expect(cert.covered_record_ids).toEqual(expect.arrayContaining([r1.id, r2.id]));
      expect(cert.signature_hash).toHaveLength(64); // SHA-256

      certRef = cert.certificate_ref;
    });

    it('freezes coverage: adding subsequent records in same period does not alter issued certificate', async () => {
      // Seed 2 verified records in January 2026
      const d1 = crypto.randomUUID();
      const d2 = crypto.randomUUID();
      const dec1 = crypto.randomUUID();
      const dec2 = crypto.randomUUID();

      await db.insert(trustDecisions).values([
        { id: dec1, subject_type: 'DEPOSIT', subject_id: d1, decision: 'AUTO_CLEAR', evaluated_signals: {} },
        { id: dec2, subject_type: 'DEPOSIT', subject_id: d2, decision: 'AUTO_CLEAR', evaluated_signals: {} },
      ]);

      const r1 = await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: d1,
        trustDecisionId: dec1,
        userId: user.id,
        category: 'PAPER',
        declaredQuantity: 50,
        unit: 'kg',
        institutionId: campusId,
        effectiveDate: new Date('2026-01-10'),
      });

      const r2 = await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: d2,
        trustDecisionId: dec2,
        userId: user.id,
        category: 'METAL',
        declaredQuantity: 20,
        unit: 'kg',
        institutionId: campusId,
        effectiveDate: new Date('2026-01-15'),
      });

      // Generate certificate for Jan 1 - Jan 31, 2026
      const cert = await ImpactDomain.generateCertificate({
        institutionId: campusId,
        periodStart: '2026-01-01T00:00:00.000Z',
        periodEnd: '2026-01-31T23:59:59.000Z',
      });

      // Add a third verified deposit in the same January period
      const d3 = crypto.randomUUID();
      const dec3 = crypto.randomUUID();
      await db.insert(trustDecisions).values({ id: dec3, subject_type: 'DEPOSIT', subject_id: d3, decision: 'AUTO_CLEAR', evaluated_signals: {} });
      await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: d3,
        trustDecisionId: dec3,
        userId: user.id,
        category: 'GLASS',
        declaredQuantity: 100,
        unit: 'kg',
        institutionId: campusId,
        effectiveDate: new Date('2026-01-20'),
      });

      // Verify certificate by public ref endpoint
      const verifyReq = new Request(`http://localhost/api/v1/certificates/${cert.certificate_ref}`);
      const verifyRes = await verifyCertificateRoute(verifyReq, routeParams(cert.certificate_ref));
      expect(verifyRes.status).toBe(200);

      const verifyBody = await verifyRes.json();
      expect(verifyBody.totalMassKg).toBe(Number(cert.total_mass_kg)); // Still 70 kg
      expect(verifyBody.recordCount).toBe(2); // Still 2 covered records
      expect(verifyBody.verificationStatus).toBe('VERIFIED_AUTHENTIC');
    });

    it('GET /api/v1/certificates/[ref] is public, unauthenticated, and exposes ZERO personal data', async () => {
      // Seed verified record & certificate
      const d1 = crypto.randomUUID();
      const dec1 = crypto.randomUUID();
      await db.insert(trustDecisions).values({ id: dec1, subject_type: 'DEPOSIT', subject_id: d1, decision: 'AUTO_CLEAR', evaluated_signals: {} });
      await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: d1,
        trustDecisionId: dec1,
        userId: user.id,
        category: 'PAPER',
        declaredQuantity: 50,
        unit: 'kg',
        institutionId: campusId,
        effectiveDate: new Date('2026-01-10'),
      });

      const cert = await ImpactDomain.generateCertificate({
        institutionId: campusId,
        periodStart: '2026-01-01T00:00:00.000Z',
        periodEnd: '2026-01-31T23:59:59.000Z',
      });

      // Call public endpoint without any Authorization header
      const verifyReq = new Request(`http://localhost/api/v1/certificates/${cert.certificate_ref}`);
      const verifyRes = await verifyCertificateRoute(verifyReq, routeParams(cert.certificate_ref));
      expect(verifyRes.status).toBe(200);

      const body = await verifyRes.json();
      expect(body.certificateRef).toBe(cert.certificate_ref);
      expect(body.institutionName).toBe('BRAC University');
      expect(body.methodology.uncertaintyRange).toBeDefined();
      expect(body.signatureHash).toBeDefined();

      // Privacy assertion: No user IDs, emails, or student names anywhere in response
      const responseString = JSON.stringify(body);
      expect(responseString).not.toContain(user.id);
      expect(responseString).not.toContain('student@g.bracu.ac.bd');
      expect(responseString).not.toContain('userId');
      expect(responseString).not.toContain('user_id');
    });

    it('GET /api/v1/certificates/[ref] returns 404 for unknown reference', async () => {
      const unknownRef = 'CERT-UNKNOWN-2026-deadbeef';
      const req = new Request(`http://localhost/api/v1/certificates/${unknownRef}`);
      const res = await verifyCertificateRoute(req, routeParams(unknownRef));
      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // 5. DOE E-WASTE REGULATORY COMPLIANCE REPORTING
  // =========================================================================
  describe('5. DoE E-Waste Regulatory Compliance (A12 & Admin API)', () => {
    it('GET /api/v1/admin/impact/ewaste-compliance generates compliance audit with licensed partner evidence', async () => {
      // 1. Seed verified e-waste deposit (10 pieces of e-waste = 20 kg)
      const d1 = crypto.randomUUID();
      const dec1 = crypto.randomUUID();

      const [session] = await db
        .insert(dropSessions)
        .values({
          zone_id: dropZoneId,
          user_id: user.id,
          session_secret: 'sec-ewaste',
          short_code: '654321',
          status: 'CONSUMED',
          expires_at: new Date(Date.now() + 15 * 60 * 1000),
        })
        .returning();

      const [deposit] = await db
        .insert(depositRecords)
        .values({
          session_id: session.id,
          zone_id: dropZoneId,
          user_id: user.id,
          category: 'E_WASTE',
          unit: 'piece',
          declared_quantity: '10.00',
          verified_quantity: '10.00',
          evidence_url: 'https://evidence.chokro.org/ewaste-10pcs.jpg',
          estimated_bdt: '2000.00',
          status: 'VERIFIED',
        })
        .returning();

      await db.insert(trustDecisions).values({
        id: dec1,
        subject_type: 'DEPOSIT',
        subject_id: deposit.id,
        decision: 'AUTO_CLEAR',
        decided_by: 'ADMIN_SUPERVISOR',
        evaluated_signals: {},
      });

      await ImpactDomain.recordVerifiedImpact({
        custodyType: 'DEPOSIT',
        custodyId: deposit.id,
        trustDecisionId: dec1,
        userId: user.id,
        category: 'E_WASTE',
        declaredQuantity: 10,
        verifiedQuantity: 10,
        unit: 'piece',
        institutionId: campusId,
      });

      // 2. Query compliance report as Admin
      const req = new Request('http://localhost/api/v1/admin/impact/ewaste-compliance', {
        headers: authHeaders(adminToken),
      });
      const res = await getAdminEwasteComplianceRoute(req);
      expect(res.status).toBe(200);

      const report = await res.json();
      expect(report.totalItems).toBe(1);
      expect(report.totalMassKg).toBe(20); // 10 pieces * 2.0 kg
      expect(report.licensedPartnerPercentage).toBe(100);
      expect(report.flaggedGapsCount).toBe(0);

      const item = report.items[0];
      expect(item.destinationPartnerName).toBe('Green Dhaka Recyclers Ltd');
      expect(item.destinationDoeLicenseDoc).toBe('DOE-PERMIT-2026-BRACU-01.pdf');
      expect(item.isLicensedPartner).toBe(true);
      expect(item.decidedBy).toBe('ADMIN_SUPERVISOR');
      expect(item.chainComplete).toBe(true);
    });

    it('rejects non-admin users from accessing e-waste regulatory compliance report', async () => {
      const req = new Request('http://localhost/api/v1/admin/impact/ewaste-compliance', {
        headers: authHeaders(userToken), // Non-admin INDIVIDUAL
      });
      const res = await getAdminEwasteComplianceRoute(req);
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 6. INSTITUTIONAL SPONSORSHIP POOLS & BUDGET MANAGEMENT
  // =========================================================================
  describe('6. Institutional Sponsorship Pools & Monthly Draw Caps', () => {
    it('deducts verified member credits from campus sponsorship pool and enforces monthly draw cap', async () => {
      // 1. Seed sponsorship pool for BRACU: Total 50,000 BDT, Monthly Cap 10,000 BDT
      const [pool] = await db
        .insert(sponsorshipPools)
        .values({
          institution_id: campusId,
          total_budget_bdt: '50000.00',
          remaining_budget_bdt: '50000.00',
          monthly_draw_cap_bdt: '10000.00',
        })
        .returning();

      // 2. Member earns 1,500 BDT credit -> draws from institution pool
      const draw1 = await ImpactDomain.drawSponsorshipPool(campusId, 1500);
      expect(draw1.fundedBy).toBe('INSTITUTION');
      expect(draw1.drawnBdt).toBe(1500);
      expect(draw1.remainingBudgetBdt).toBe(48500);
      expect(draw1.isNearExhaustion).toBe(false);

      // 3. Claim exceeding monthly cap (15,000 BDT > 10,000 BDT cap) falls back to platform pool
      const draw2 = await ImpactDomain.drawSponsorshipPool(campusId, 15000);
      expect(draw2.fundedBy).toBe('PLATFORM');
      expect(draw2.reason).toBe('MONTHLY_CAP_EXCEEDED');

      // 4. Draw pool down near exhaustion (<= 15% of 50,000 = 7,500 BDT)
      await impactRepo.updateSponsorshipPoolRemaining(pool.id, 6000);
      const draw3 = await ImpactDomain.drawSponsorshipPool(campusId, 1000);
      expect(draw3.fundedBy).toBe('INSTITUTION');
      expect(draw3.remainingBudgetBdt).toBe(5000);
      expect(draw3.isNearExhaustion).toBe(true); // 5000 / 50000 = 10% <= 15%

      // 5. Exhausted pool falls back to platform pool
      await impactRepo.updateSponsorshipPoolRemaining(pool.id, 0);
      const draw4 = await ImpactDomain.drawSponsorshipPool(campusId, 500);
      expect(draw4.fundedBy).toBe('PLATFORM');
      expect(draw4.reason).toBe('POOL_EXHAUSTED');
    });
  });

  // =========================================================================
  // 7. ADMIN CERTIFICATES REGISTRY (A12)
  // =========================================================================
  describe('7. Admin Certificates Registry (GET /api/v1/admin/impact/certificates)', () => {
    it('returns all issued certificates to admin and rejects non-admin', async () => {
      // Seed a certificate
      await db.insert(sustainabilityCertificates).values({
        institution_id: campusId,
        certificate_ref: 'CERT-BRACU-2026-test1234',
        period_start: new Date('2026-01-01'),
        period_end: new Date('2026-01-31'),
        total_mass_kg: '150.00',
        total_co2e_kg: '280.000',
        covered_record_ids: ['rec-1', 'rec-2'],
        signature_hash: 'sha256-mock-sig',
      });

      // Admin request
      const adminReq = new Request('http://localhost/api/v1/admin/impact/certificates', {
        headers: authHeaders(adminToken),
      });
      const adminRes = await getAdminCertificatesRoute(adminReq);
      expect(adminRes.status).toBe(200);
      const adminBody = await adminRes.json();
      expect(adminBody.certificates.length).toBeGreaterThanOrEqual(1);
      expect(adminBody.certificates[0].certificate_ref).toBe('CERT-BRACU-2026-test1234');

      // Non-admin request
      const userReq = new Request('http://localhost/api/v1/admin/impact/certificates', {
        headers: authHeaders(userToken),
      });
      const userRes = await getAdminCertificatesRoute(userReq);
      expect(userRes.status).toBe(403);
    });
  });
});
