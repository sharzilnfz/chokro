import crypto from 'crypto';
import { POST as extractKyc } from '../app/api/v1/partners/kyc/extract/route';
import { GET as getKycQueue } from '../app/api/v1/admin/partners/kyc/queue/route';
import { POST as adjudicateKyc } from '../app/api/v1/admin/partners/kyc/[id]/adjudicate/route';
import { POST as applyPartner } from '../app/api/partners/apply/route';
import { PartnerKycDomain, parseFlexibleDate } from '../lib/domain/PartnerKycDomain';
import { partnerRepo } from '../lib/repos/partners';
import { userRepo } from '../lib/repos/users';
import { kycExtractionsRepo } from '../lib/repos/kycExtractions';
import { partnerComplianceAuditsRepo } from '../lib/repos/partnerComplianceAudits';
import { authHeaders, createTestUser, resetTestStore, tokenFor, routeParams } from './test-utils';

describe('SPEC 15: Partner KYC Document Intelligence & DoE Licence Gate', () => {
  beforeEach(async () => {
    await resetTestStore();
  });

  describe('1. Domain: OCR Entity Parsing, Date Heuristics & Discrepancy Matrix', () => {
    it('extracts trade license entities from unstructured Bangladeshi license text', () => {
      const rawSample = `
        DHAKA NORTH CITY CORPORATION
        ZONE-03 (MIRPUR/GULSHAN)
        TRADE LICENSE / ব্যবসায়িক লাইসেন্স
        Trade License No: TRAD/DNCC/012345/2023
        Name of Enterprise: Green Earth Recyclers Ltd.
        Proprietor: Sadat Rahman
        Date of Issue: 2023-07-01
        Expiry Date: 2028-06-30
        TIN: 887766554433
        Nature of Business: Non-hazardous scrap recycling and sorting
      `;

      const entities = PartnerKycDomain.extractEntitiesFromText(rawSample);

      expect(entities.licenseNumber).toBe('TRAD/DNCC/012345/2023');
      expect(entities.orgName).toBe('Green Earth Recyclers Ltd.');
      expect(entities.tin).toBe('887766554433');
      expect(entities.expiryDate).toBeInstanceOf(Date);
      expect(entities.isDoeAuthorized).toBe(false);
    });

    it('extracts DoE statutory E-Waste permits with authorization recognition', () => {
      const rawSample = `
        GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH
        DEPARTMENT OF ENVIRONMENT (DoE)
        Paribesh Bhaban, Agargaon, Dhaka-1207
        STATUTORY E-WASTE RECYCLING PERMIT
        Permit No: DOE/E-WASTE/2021/887
        Authorized Enterprise: Dhaka Circular E-Waste Solutions Ltd.
        E-Waste Management Rules 2021 Category: Class-A Hazardous Dismantler
        Issue Date: 2022-01-15
        Valid Up To: 31/12/2027
        TIN: 123456789012
      `;

      const entities = PartnerKycDomain.extractEntitiesFromText(rawSample);

      expect(entities.licenseNumber).toBe('DOE/E-WASTE/2021/887');
      expect(entities.orgName).toBe('Dhaka Circular E-Waste Solutions Ltd.');
      expect(entities.isDoeAuthorized).toBe(true);
      expect(entities.expiryDate).toBeInstanceOf(Date);
    });

    it('parses various date formats accurately with parseFlexibleDate', () => {
      const d1 = parseFlexibleDate('2028-06-30');
      const d2 = parseFlexibleDate('31/12/2027');
      const d3 = parseFlexibleDate('15-08-2026');

      expect(d1?.getUTCFullYear()).toBe(2028);
      expect(d2?.getUTCFullYear()).toBe(2027);
      expect(d3?.getUTCFullYear()).toBe(2026);
    });

    it('computes exact match discrepancy matrix when submitted values match extracted text', () => {
      const extracted = PartnerKycDomain.extractEntitiesFromText(`
        Trade License No: TRAD/DNCC/099887/2024
        Enterprise: Apex Circular Recyclers
        Expiry Date: 2028-12-31
      `);

      const discrepancy = PartnerKycDomain.evaluateDiscrepancies(
        { licenseNumber: 'TRAD/DNCC/099887/2024', orgName: 'Apex Circular Recyclers' },
        extracted,
        new Date('2026-01-01')
      );

      expect(discrepancy.matchStatus).toBe('EXACT_MATCH');
      expect(discrepancy.isExpired).toBe(false);
      expect(discrepancy.mismatchedFields).toEqual([]);
      expect(discrepancy.confidenceScore).toBeGreaterThanOrEqual(0.85);
    });

    it('flags license number mismatch and drops confidence score', () => {
      const extracted = PartnerKycDomain.extractEntitiesFromText(`
        Trade License No: TRAD/DNCC/099887/2024
        Enterprise: Apex Circular Recyclers
        Expiry Date: 2028-12-31
      `);

      const discrepancy = PartnerKycDomain.evaluateDiscrepancies(
        { licenseNumber: 'TRAD/DSCC/000001/2020', orgName: 'Apex Circular Recyclers' },
        extracted,
        new Date('2026-01-01')
      );

      expect(discrepancy.mismatchedFields).toContain('license_number');
      expect(discrepancy.matchStatus).not.toBe('EXACT_MATCH');
      expect(discrepancy.confidenceScore).toBeLessThan(0.85);
    });

    it('automatically marks expired licenses as EXPIRED when expiry date precedes current time', () => {
      const extracted = PartnerKycDomain.extractEntitiesFromText(`
        Trade License No: TRAD/DNCC/099887/2024
        Enterprise: Apex Circular Recyclers
        Expiry Date: 2020-01-01
      `);

      const discrepancy = PartnerKycDomain.evaluateDiscrepancies(
        { licenseNumber: 'TRAD/DNCC/099887/2024', orgName: 'Apex Circular Recyclers' },
        extracted,
        new Date('2026-08-20')
      );

      expect(discrepancy.isExpired).toBe(true);
      expect(discrepancy.matchStatus).toBe('EXPIRED');
    });

    it('executes in degraded local fallback mode without crashing when Google Vision API is absent', async () => {
      const res = await PartnerKycDomain.runOcrTextDetection({
        documentUrl: 'https://storage.chokro.org/sample-doc.pdf',
        rawDocumentText: 'Trade License No: TRAD/DNCC/554433/2024 Enterprise: Bengal Scrap Ltd. Expiry: 2027-12-31',
      });

      expect(res.provider).toBe('LOCAL_FALLBACK');
      expect(res.rawText).toContain('TRAD/DNCC/554433/2024');
    });
  });

  describe('2. POST /api/v1/partners/kyc/extract', () => {
    it('requires authentication (401)', async () => {
      const req = new Request('http://localhost/api/v1/partners/kyc/extract', {
        method: 'POST',
        body: JSON.stringify({ partnerId: crypto.randomUUID(), documentUrl: 'https://chokro.org/doc.pdf' }),
      });
      const res = await extractKyc(req);
      expect(res.status).toBe(401);
    });

    it('returns 404 when partnerId does not exist', async () => {
      const user = await createTestUser('PARTNER');
      const req = new Request('http://localhost/api/v1/partners/kyc/extract', {
        method: 'POST',
        headers: authHeaders(tokenFor(user)),
        body: JSON.stringify({
          partnerId: crypto.randomUUID(),
          documentUrl: 'https://chokro.org/doc.pdf',
          documentType: 'TRADE_LICENSE',
        }),
      });
      const res = await extractKyc(req);
      expect(res.status).toBe(404);
    });

    it('ingests trade license, extracts entities, and persists extraction record', async () => {
      const user = await createTestUser('INDIVIDUAL');
      const applied = await applyPartner(new Request('http://localhost/api/partners/apply', {
        method: 'POST',
        headers: authHeaders(tokenFor(user)),
        body: JSON.stringify({ orgName: 'Green Tech Recycling Ltd.', types: ['RECYCLER'] }),
      }));
      const { partner } = await applied.json();

      const req = new Request('http://localhost/api/v1/partners/kyc/extract', {
        method: 'POST',
        headers: authHeaders(tokenFor(user)),
        body: JSON.stringify({
          partnerId: partner.id,
          documentUrl: 'https://storage.chokro.org/license-101.pdf',
          documentType: 'TRADE_LICENSE',
          submittedLicenseNumber: 'TRAD/DNCC/012345/2023',
          submittedOrgName: 'Green Tech Recycling Ltd.',
          rawDocumentText: `
            Dhaka North City Corporation
            Trade License No: TRAD/DNCC/012345/2023
            Name of Enterprise: Green Tech Recycling Ltd.
            Valid Until: 2028-12-31
            TIN: 998877665544
          `,
        }),
      });

      const res = await extractKyc(req);
      expect(res.status).toBe(201);
      const data = await res.json();

      expect(data.extractionId).toBeDefined();
      expect(data.matchStatus).toBe('EXACT_MATCH');
      expect(data.confidenceScore).toBeGreaterThanOrEqual(0.85);
      expect(data.extractedFields.licenseNumber).toBe('TRAD/DNCC/012345/2023');
      expect(data.extractedFields.orgName).toBe('Green Tech Recycling Ltd.');
      expect(data.isExpired).toBe(false);
      expect(data.degradedMode).toBe(true);

      // Verify stored in DB
      const dbRecord = await kycExtractionsRepo.findById(data.extractionId);
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.extracted_license_number).toBe('TRAD/DNCC/012345/2023');
      expect(dbRecord?.match_status).toBe('EXACT_MATCH');
    });

    it('flags expired licenses with matchStatus EXPIRED in extraction response', async () => {
      const user = await createTestUser('INDIVIDUAL');
      const applied = await applyPartner(new Request('http://localhost/api/partners/apply', {
        method: 'POST',
        headers: authHeaders(tokenFor(user)),
        body: JSON.stringify({ orgName: 'Old Scrap Co.', types: ['COLLECTOR'] }),
      }));
      const { partner } = await applied.json();

      const req = new Request('http://localhost/api/v1/partners/kyc/extract', {
        method: 'POST',
        headers: authHeaders(tokenFor(user)),
        body: JSON.stringify({
          partnerId: partner.id,
          documentUrl: 'https://storage.chokro.org/expired-license.pdf',
          documentType: 'TRADE_LICENSE',
          submittedLicenseNumber: 'TRAD/DNCC/777888/2019',
          rawDocumentText: `
            Trade License No: TRAD/DNCC/777888/2019
            Enterprise: Old Scrap Co.
            Expiry Date: 2021-06-30
          `,
        }),
      });

      const res = await extractKyc(req);
      expect(res.status).toBe(201);
      const data = await res.json();

      expect(data.isExpired).toBe(true);
      expect(data.matchStatus).toBe('EXPIRED');
    });
  });

  describe('3. GET /api/v1/admin/partners/kyc/queue', () => {
    it('requires admin authorization (401 unauth, 403 non-admin)', async () => {
      const user = await createTestUser('INDIVIDUAL');
      const unauth = await getKycQueue(new Request('http://localhost/api/v1/admin/partners/kyc/queue'));
      const nonAdmin = await getKycQueue(new Request('http://localhost/api/v1/admin/partners/kyc/queue', {
        headers: authHeaders(tokenFor(user)),
      }));

      expect(unauth.status).toBe(401);
      expect(nonAdmin.status).toBe(403);
    });

    it('returns queued extractions with computed side-by-side diff metadata', async () => {
      const admin = await createTestUser('ADMIN');
      const partnerUser = await createTestUser('INDIVIDUAL');

      const applied = await applyPartner(new Request('http://localhost/api/partners/apply', {
        method: 'POST',
        headers: authHeaders(tokenFor(partnerUser)),
        body: JSON.stringify({ orgName: 'Circular Metals Corp', types: ['COLLECTOR', 'RECYCLER'] }),
      }));
      const { partner } = await applied.json();

      // Submit extraction with license mismatch
      await extractKyc(new Request('http://localhost/api/v1/partners/kyc/extract', {
        method: 'POST',
        headers: authHeaders(tokenFor(partnerUser)),
        body: JSON.stringify({
          partnerId: partner.id,
          documentUrl: 'https://storage.chokro.org/metal-doc.pdf',
          documentType: 'TRADE_LICENSE',
          submittedLicenseNumber: 'TRAD/DNCC/CLAIMED-100',
          submittedOrgName: 'Circular Metals Corp',
          rawDocumentText: 'Trade License No: TRAD/DNCC/EXTRACTED-999 Enterprise: Circular Metals Corp Expiry: 2028-01-01',
        }),
      }));

      const queueRes = await getKycQueue(new Request('http://localhost/api/v1/admin/partners/kyc/queue', {
        headers: authHeaders(tokenFor(admin)),
      }));
      expect(queueRes.status).toBe(200);
      const data = await queueRes.json();

      expect(Array.isArray(data.queue)).toBe(true);
      expect(data.queue.length).toBe(1);
      const item = data.queue[0];

      expect(item.partnerOrgName).toBe('Circular Metals Corp');
      expect(item.extractedLicenseNumber).toBe('TRAD/DNCC/EXTRACTED-999');
      expect(item.diffs.licenseMismatch).toBe(true);
      expect(item.diffs.orgNameMismatch).toBe(false);
      expect(item.diffs.isExpired).toBe(false);
    });

    it('supports status filtering (?status=EXPIRED)', async () => {
      const admin = await createTestUser('ADMIN');
      const partnerUser = await createTestUser('INDIVIDUAL');

      const applied = await applyPartner(new Request('http://localhost/api/partners/apply', {
        method: 'POST',
        headers: authHeaders(tokenFor(partnerUser)),
        body: JSON.stringify({ orgName: 'Test Filtering Hub', types: ['RECYCLER'] }),
      }));
      const { partner } = await applied.json();

      // 1. Create expired extraction
      await extractKyc(new Request('http://localhost/api/v1/partners/kyc/extract', {
        method: 'POST',
        headers: authHeaders(tokenFor(partnerUser)),
        body: JSON.stringify({
          partnerId: partner.id,
          documentUrl: 'https://storage.chokro.org/expired.pdf',
          documentType: 'TRADE_LICENSE',
          rawDocumentText: 'Trade License No: TRAD/DNCC/001 Enterprise: Test Filtering Hub Expiry: 2019-01-01',
        }),
      }));

      // 2. Create valid extraction
      await extractKyc(new Request('http://localhost/api/v1/partners/kyc/extract', {
        method: 'POST',
        headers: authHeaders(tokenFor(partnerUser)),
        body: JSON.stringify({
          partnerId: partner.id,
          documentUrl: 'https://storage.chokro.org/valid.pdf',
          documentType: 'TRADE_LICENSE',
          submittedLicenseNumber: 'TRAD/DNCC/002',
          rawDocumentText: 'Trade License No: TRAD/DNCC/002 Enterprise: Test Filtering Hub Expiry: 2029-01-01',
        }),
      }));

      const expiredRes = await getKycQueue(new Request('http://localhost/api/v1/admin/partners/kyc/queue?status=EXPIRED', {
        headers: authHeaders(tokenFor(admin)),
      }));
      const exactRes = await getKycQueue(new Request('http://localhost/api/v1/admin/partners/kyc/queue?status=EXACT_MATCH', {
        headers: authHeaders(tokenFor(admin)),
      }));

      const expiredData = await expiredRes.json();
      const exactData = await exactRes.json();

      expect(expiredData.queue.length).toBe(1);
      expect(expiredData.queue[0].matchStatus).toBe('EXPIRED');
      expect(exactData.queue.length).toBe(1);
      expect(exactData.queue[0].matchStatus).toBe('EXACT_MATCH');
    });
  });

  describe('4. POST /api/v1/admin/partners/kyc/[id]/adjudicate', () => {
    it('requires admin authorization', async () => {
      const user = await createTestUser('INDIVIDUAL');
      const res = await adjudicateKyc(
        new Request('http://localhost/api/v1/admin/partners/kyc/123/adjudicate', {
          method: 'POST',
          headers: authHeaders(tokenFor(user)),
          body: JSON.stringify({ decision: 'APPROVE' }),
        }),
        routeParams('123')
      );
      expect(res.status).toBe(403);
    });

    it('approves partner and grants e_waste_licensed platform capability with immutable compliance audit', async () => {
      const admin = await createTestUser('ADMIN');
      const partnerUser = await createTestUser('INDIVIDUAL');

      // 1. Submit application with DoE permit
      const applied = await applyPartner(new Request('http://localhost/api/partners/apply', {
        method: 'POST',
        headers: authHeaders(tokenFor(partnerUser)),
        body: JSON.stringify({
          orgName: 'National E-Waste Dismantlers',
          types: ['RECYCLER'],
          eWasteLicensed: true,
          doeLicenseDoc: 'https://storage.chokro.org/doe-cert-2021.pdf',
        }),
      }));
      const { partner } = await applied.json();
      expect(partner.e_waste_licensed).toBe(false);

      // 2. Run OCR extraction
      const extractRes = await extractKyc(new Request('http://localhost/api/v1/partners/kyc/extract', {
        method: 'POST',
        headers: authHeaders(tokenFor(partnerUser)),
        body: JSON.stringify({
          partnerId: partner.id,
          documentUrl: 'https://storage.chokro.org/doe-cert-2021.pdf',
          documentType: 'DOE_EWASTE_PERMIT',
          submittedLicenseNumber: 'DOE/E-WASTE/2021/999',
          submittedOrgName: 'National E-Waste Dismantlers',
          rawDocumentText: `
            Department of Environment
            Permit No: DOE/E-WASTE/2021/999
            Enterprise: National E-Waste Dismantlers
            Valid Up To: 2028-12-31
            E-Waste Management Rules 2021 Verified
          `,
        }),
      }));
      const { extractionId } = await extractRes.json();

      // 3. Admin adjudicates with approval and grants e-waste capability
      const adjRes = await adjudicateKyc(
        new Request(`http://localhost/api/v1/admin/partners/kyc/${extractionId}/adjudicate`, {
          method: 'POST',
          headers: authHeaders(tokenFor(admin)),
          body: JSON.stringify({
            decision: 'APPROVE',
            grantEwasteLicense: true,
            notes: 'Verified against DoE national compliance portal. Valid through 2028.',
          }),
        }),
        routeParams(extractionId)
      );

      expect(adjRes.status).toBe(200);
      const adjData = await adjRes.json();

      // Assert partner state & capability
      expect(adjData.partner.status).toBe('VERIFIED');
      expect(adjData.partner.e_waste_licensed).toBe(true);

      // Assert user role promoted to PARTNER
      const dbUser = await userRepo.findById(partnerUser.id);
      expect(dbUser?.role).toBe('PARTNER');

      // Assert immutable compliance audit record
      const audits = await partnerComplianceAuditsRepo.findByPartnerId(partner.id);
      expect(audits.length).toBe(1);
      expect(audits[0].previous_status).toBe('APPLIED');
      expect(audits[0].new_status).toBe('VERIFIED');
      expect(audits[0].actor_id).toBe(admin.id);
      expect(audits[0].reason).toContain('Verified against DoE national compliance portal');
      expect((audits[0].granted_capabilities as any)?.e_waste_licensed).toBe(true);
    });

    it('rejects partner on expired/fraudulent document, revoking permissions and logging audit reason', async () => {
      const admin = await createTestUser('ADMIN');
      const partnerUser = await createTestUser('INDIVIDUAL');

      const applied = await applyPartner(new Request('http://localhost/api/partners/apply', {
        method: 'POST',
        headers: authHeaders(tokenFor(partnerUser)),
        body: JSON.stringify({ orgName: 'Unverified Scrap Recycler', types: ['RECYCLER'] }),
      }));
      const { partner } = await applied.json();

      // Run extraction on expired license
      const extractRes = await extractKyc(new Request('http://localhost/api/v1/partners/kyc/extract', {
        method: 'POST',
        headers: authHeaders(tokenFor(partnerUser)),
        body: JSON.stringify({
          partnerId: partner.id,
          documentUrl: 'https://storage.chokro.org/expired-doc.pdf',
          documentType: 'TRADE_LICENSE',
          rawDocumentText: 'Trade License No: TRAD/2018/001 Enterprise: Unverified Scrap Recycler Expiry: 2019-12-31',
        }),
      }));
      const { extractionId } = await extractRes.json();

      // Admin adjudicates with REJECT
      const adjRes = await adjudicateKyc(
        new Request(`http://localhost/api/v1/admin/partners/kyc/${extractionId}/adjudicate`, {
          method: 'POST',
          headers: authHeaders(tokenFor(admin)),
          body: JSON.stringify({
            decision: 'REJECT',
            notes: 'Statutory trade license expired in 2019. Non-compliant with recycling regulations.',
          }),
        }),
        routeParams(extractionId)
      );

      expect(adjRes.status).toBe(200);
      const adjData = await adjRes.json();

      expect(adjData.partner.status).toBe('REJECTED');
      expect(adjData.partner.e_waste_licensed).toBe(false);
      expect(adjData.partner.reason).toContain('Statutory trade license expired in 2019');

      // Assert user role remains INDIVIDUAL
      const dbUser = await userRepo.findById(partnerUser.id);
      expect(dbUser?.role).toBe('INDIVIDUAL');

      // Assert compliance audit entry
      const audits = await partnerComplianceAuditsRepo.findByPartnerId(partner.id);
      expect(audits.length).toBe(1);
      expect(audits[0].new_status).toBe('REJECTED');
    });

    it('requests document re-upload, setting partner status to APPLIED with corrective instructions', async () => {
      const admin = await createTestUser('ADMIN');
      const partnerUser = await createTestUser('INDIVIDUAL');

      const applied = await applyPartner(new Request('http://localhost/api/partners/apply', {
        method: 'POST',
        headers: authHeaders(tokenFor(partnerUser)),
        body: JSON.stringify({ orgName: 'Blurry Doc Recycler', types: ['COLLECTOR'] }),
      }));
      const { partner } = await applied.json();

      const extractRes = await extractKyc(new Request('http://localhost/api/v1/partners/kyc/extract', {
        method: 'POST',
        headers: authHeaders(tokenFor(partnerUser)),
        body: JSON.stringify({
          partnerId: partner.id,
          documentUrl: 'https://storage.chokro.org/blurry.jpg',
          documentType: 'TRADE_LICENSE',
          rawDocumentText: 'Blurry unreadable text',
        }),
      }));
      const { extractionId } = await extractRes.json();

      const adjRes = await adjudicateKyc(
        new Request(`http://localhost/api/v1/admin/partners/kyc/${extractionId}/adjudicate`, {
          method: 'POST',
          headers: authHeaders(tokenFor(admin)),
          body: JSON.stringify({
            decision: 'REQUEST_REUPLOAD',
            notes: 'Uploaded image is blurry and license number cannot be verified. Please upload a 300 DPI PDF.',
          }),
        }),
        routeParams(extractionId)
      );

      expect(adjRes.status).toBe(200);
      const adjData = await adjRes.json();

      expect(adjData.partner.status).toBe('APPLIED');
      expect(adjData.partner.reason).toContain('Uploaded image is blurry');
    });
  });
});
