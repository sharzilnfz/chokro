import { POST as applyPartner } from '../app/api/partners/apply/route';
import { GET as getMyPartner, PATCH as updateMyCapabilities } from '../app/api/partners/me/route';
import { POST as verifyPartner, GET as listPartners } from '../app/api/admin/partners/route';
import { userRepo } from '../lib/repos/users';
import { authHeaders, createTestUser, resetTestStore, tokenFor } from './test-utils';

// Partner API: application gating, admin verification workflow, user role transitions, and status lookup.
describe('partner API', () => {
  // Fresh store per case.
  beforeEach(async () => {
    await resetTestStore();
  });

  // Applying requires auth, and the DoE gate rejects claimed e-waste without a doc.
  it('requires authentication and enforces the DoE gate on application', async () => {
    const body = { orgName: 'Green Tech', types: ['RECYCLER'], eWasteLicensed: true };
    const missingAuth = await applyPartner(new Request('http://localhost/api/partners/apply', {
      method: 'POST', body: JSON.stringify(body),
    }));
    const user = await createTestUser();
    const authenticated = await applyPartner(new Request('http://localhost/api/partners/apply', {
      method: 'POST', headers: authHeaders(tokenFor(user)), body: JSON.stringify(body),
    }));
    expect(missingAuth.status).toBe(401);
    expect(authenticated.status).toBe(400);
  });

  // Only an admin can verify; verification flips on e-waste when documented and promotes user role to PARTNER.
  it('requires admin and grants the e-waste capability only at verification with a DoE document, promoting user role', async () => {
    const user = await createTestUser('INDIVIDUAL');
    const admin = await createTestUser('ADMIN');
    const applied = await applyPartner(new Request('http://localhost/api/partners/apply', {
      method: 'POST', headers: authHeaders(tokenFor(user)),
      body: JSON.stringify({ orgName: 'Green Tech', types: ['RECYCLER'], eWasteLicensed: true, doeLicenseDoc: 'doe-ref-42' }),
    }));
    const { partner } = await applied.json();

    const unauthenticated = await verifyPartner(new Request('http://localhost/api/admin/partners', {
      method: 'POST', body: JSON.stringify({ partnerId: partner.id, status: 'VERIFIED' }),
    }));
    const nonAdmin = await verifyPartner(new Request('http://localhost/api/admin/partners', {
      method: 'POST', headers: authHeaders(tokenFor(user)), body: JSON.stringify({ partnerId: partner.id, status: 'VERIFIED' }),
    }));
    const adminResponse = await verifyPartner(new Request('http://localhost/api/admin/partners', {
      method: 'POST', headers: authHeaders(tokenFor(admin)), body: JSON.stringify({ partnerId: partner.id, status: 'VERIFIED' }),
    }));
    const queue = await listPartners(new Request('http://localhost/api/admin/partners', { headers: authHeaders(tokenFor(admin)) }));
    const verified = (await queue.json()).partners[0];

    expect(applied.status).toBe(201);
    expect(partner.e_waste_licensed).toBe(false);
    expect(unauthenticated.status).toBe(401);
    expect(nonAdmin.status).toBe(403);
    expect(adminResponse.status).toBe(200);
    expect(verified.status).toBe('VERIFIED');
    expect(verified.e_waste_licensed).toBe(true);

    // Verify user role was promoted from INDIVIDUAL to PARTNER
    const dbUser = await userRepo.findById(user.id);
    expect(dbUser?.role).toBe('PARTNER');

    // Verify GET /api/partners/me returns VERIFIED status
    const meRes = await getMyPartner(new Request('http://localhost/api/partners/me', {
      headers: authHeaders(tokenFor(user)),
    }));
    const meData = await meRes.json();
    expect(meRes.status).toBe(200);
    expect(meData.partner.status).toBe('VERIFIED');
    expect(meData.partner.e_waste_licensed).toBe(true);
  });

  // Without a DoE doc on file, even admin verification never grants e-waste.
  it('never grants the e-waste capability without a DoE document on file', async () => {
    const user = await createTestUser();
    const admin = await createTestUser('ADMIN');
    const applied = await applyPartner(new Request('http://localhost/api/partners/apply', {
      method: 'POST', headers: authHeaders(tokenFor(user)),
      body: JSON.stringify({ orgName: 'Plain Recycler', types: ['RECYCLER'] }),
    }));
    const { partner } = await applied.json();
    const adminResponse = await verifyPartner(new Request('http://localhost/api/admin/partners', {
      method: 'POST', headers: authHeaders(tokenFor(admin)), body: JSON.stringify({ partnerId: partner.id, status: 'VERIFIED' }),
    }));
    const verified = (await adminResponse.json()).partner;

    expect(adminResponse.status).toBe(200);
    expect(verified.e_waste_licensed).toBe(false);
  });

  // Admin rejection records reason, returns it on GET /api/partners/me, and allows re-application
  it('persists rejection reason and allows applicant to re-apply with corrected details', async () => {
    const user = await createTestUser('INDIVIDUAL');
    const admin = await createTestUser('ADMIN');

    // 1. Submit initial partner application
    const applyRes = await applyPartner(new Request('http://localhost/api/partners/apply', {
      method: 'POST',
      headers: authHeaders(tokenFor(user)),
      body: JSON.stringify({
        orgName: 'Community E-Waste Hub',
        types: ['COLLECTOR'],
        capabilityFlags: { collects: true, repairs: false },
      }),
    }));
    const { partner } = await applyRes.json();
    expect(applyRes.status).toBe(201);

    // 2. Initial partner status lookup
    const myInitialRes = await getMyPartner(new Request('http://localhost/api/partners/me', {
      headers: authHeaders(tokenFor(user)),
    }));
    const myInitialData = await myInitialRes.json();
    expect(myInitialRes.status).toBe(200);
    expect(myInitialData.partner.status).toBe('APPLIED');
    expect(myInitialData.partner.reason).toBeNull();

    // 3. Admin rejects with reason
    const rejectRes = await verifyPartner(new Request('http://localhost/api/admin/partners', {
      method: 'POST',
      headers: authHeaders(tokenFor(admin)),
      body: JSON.stringify({
        partnerId: partner.id,
        status: 'REJECTED',
        reason: 'Trade license document expired. Please upload valid license.',
      }),
    }));
    expect(rejectRes.status).toBe(200);

    // 4. Partner checks status and sees rejection feedback
    const myUpdatedRes = await getMyPartner(new Request('http://localhost/api/partners/me', {
      headers: authHeaders(tokenFor(user)),
    }));
    const myUpdatedData = await myUpdatedRes.json();
    expect(myUpdatedRes.status).toBe(200);
    expect(myUpdatedData.partner.status).toBe('REJECTED');
    expect(myUpdatedData.partner.reason).toBe('Trade license document expired. Please upload valid license.');

    // Verify user role remains INDIVIDUAL
    const rejectedUser = await userRepo.findById(user.id);
    expect(rejectedUser?.role).toBe('INDIVIDUAL');

    // 5. Applicant re-applies with updated details and DoE license doc
    const reapplyRes = await applyPartner(new Request('http://localhost/api/partners/apply', {
      method: 'POST',
      headers: authHeaders(tokenFor(user)),
      body: JSON.stringify({
        orgName: 'Community E-Waste Hub (Updated)',
        types: ['COLLECTOR', 'RECYCLER'],
        eWasteLicensed: true,
        doeLicenseDoc: 'DOE-VALID-2026-CERT.pdf',
        capabilityFlags: { collects: true, repairs: true },
      }),
    }));
    expect(reapplyRes.status).toBe(201);

    // 6. Partner status is now APPLIED and previous reason is cleared
    const myReappliedRes = await getMyPartner(new Request('http://localhost/api/partners/me', {
      headers: authHeaders(tokenFor(user)),
    }));
    const myReappliedData = await myReappliedRes.json();
    expect(myReappliedRes.status).toBe(200);
    expect(myReappliedData.partner.status).toBe('APPLIED');
    expect(myReappliedData.partner.reason).toBeNull();
    expect(myReappliedData.partner.org_name).toBe('Community E-Waste Hub (Updated)');
  });

  // Partner can update their operational capability flags via PATCH /api/partners/me
  it('allows verified partner to update operational capability flags', async () => {
    const user = await createTestUser('PARTNER');
    await applyPartner(new Request('http://localhost/api/partners/apply', {
      method: 'POST',
      headers: authHeaders(tokenFor(user)),
      body: JSON.stringify({
        orgName: 'Circular Operations Center',
        types: ['COLLECTOR', 'REPAIR_SHOP'],
        capabilityFlags: { collects: true, repairs: false, buys: false },
      }),
    }));

    const patchRes = await updateMyCapabilities(new Request('http://localhost/api/partners/me', {
      method: 'PATCH',
      headers: authHeaders(tokenFor(user)),
      body: JSON.stringify({
        capabilityFlags: { collects: true, repairs: true, buys: true, accepts_donations: true },
      }),
    }));
    const patchData = await patchRes.json();
    expect(patchRes.status).toBe(200);
    expect(patchData.partner.capability_flags).toEqual({
      collects: true,
      repairs: true,
      buys: true,
      accepts_donations: true,
    });

    const getRes = await getMyPartner(new Request('http://localhost/api/partners/me', {
      headers: authHeaders(tokenFor(user)),
    }));
    const getData = await getRes.json();
    expect(getData.partner.capability_flags.repairs).toBe(true);
    expect(getData.partner.capability_flags.accepts_donations).toBe(true);
  });
});
