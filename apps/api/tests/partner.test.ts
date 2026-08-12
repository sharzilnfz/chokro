import { POST as applyPartner } from '../app/api/partners/apply/route';
import { POST as verifyPartner, GET as listPartners } from '../app/api/admin/partners/route';
import { authHeaders, createTestUser, resetTestStore, tokenFor } from './test-utils';

describe('partner API', () => {
  beforeEach(async () => {
    await resetTestStore();
  });

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

  it('requires admin and grants the e-waste capability only at verification with a DoE document', async () => {
    const user = await createTestUser();
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
  });

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
});
