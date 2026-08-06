import { POST as signupHandler } from '../app/api/auth/signup/route';
import { POST as loginHandler } from '../app/api/auth/login/route';
import { POST as createListing } from '../app/api/listings/route';
import { GET as getFeed } from '../app/api/feed/route';
import { POST as applyPartner } from '../app/api/partners/apply/route';
import { POST as verifyPartner } from '../app/api/admin/partners/route';
import { POST as createRate } from '../app/api/admin/rate-card/route';
import { POST as createZone } from '../app/api/drop-zones/route';
import { POST as adjustWallet } from '../app/api/admin/wallet/adjust/route';
import { GET as getWalletBalance } from '../app/api/wallet/balance/route';

describe('T1: Sprint 1 Walking Skeleton End-to-End Verification Gate', () => {
  jest.setTimeout(30000);

  const userEmail = `e2e_user_${Date.now()}@chokro.org`;
  const partnerEmail = `e2e_partner_${Date.now()}@chokro.org`;
  let userToken = '';
  let userId = '';
  let partnerId = '';

  it('1. Admin sets Rate Card pricing for E_WASTE', async () => {
    const req = new Request('http://localhost/api/admin/rate-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'admin-e2e' },
      body: JSON.stringify({
        category: 'E_WASTE',
        conditionBand: 'GOOD',
        unit: 'piece',
        priceBdt: 300.0,
      }),
    });
    const res = await createRate(req as any);
    expect(res.status).toBe(201);
  });

  it('2. User signs up and receives valid authentication token', async () => {
    const signupReq = new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: userEmail, password: 'password123', role: 'INDIVIDUAL' }),
    });
    const signupRes = await signupHandler(signupReq as any);
    const signupData = await signupRes.json();
    expect(signupRes.status).toBe(201);
    expect(signupData.token).toBeDefined();

    const loginReq = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: userEmail, password: 'password123' }),
    });
    const loginRes = await loginHandler(loginReq as any);
    const loginData = await loginRes.json();
    expect(loginRes.status).toBe(200);
    userToken = loginData.token;
    userId = loginData.user.id;
  });

  it('3. User creates a recyclable PLASTICS listing', async () => {
    const req = new Request('http://localhost/api/listings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        category: 'PLASTICS',
        unit: 'kg',
        declaredWeight: 15.0,
        declaredCondition: 'EXCELLENT',
        photos: ['https://example.com/e2e-plastic.jpg'],
      }),
    });
    const res = await createListing(req as any);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.listing.status).toBe('ACTIVE');
  });

  it('4. Partner applies with valid DoE License and gets verified by Admin', async () => {
    const applyReq = new Request('http://localhost/api/partners/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'partner-e2e' },
      body: JSON.stringify({
        orgName: 'Chittagong Circular Recyclers',
        types: ['RECYCLER'],
        eWasteLicensed: true,
        doeLicenseDoc: 'DOE-LICENSE-2026-CTG.pdf',
      }),
    });
    const applyRes = await applyPartner(applyReq as any);
    const applyData = await applyRes.json();
    expect(applyRes.status).toBe(201);
    partnerId = applyData.partner.id;

    const verifyReq = new Request('http://localhost/api/admin/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId, status: 'VERIFIED' }),
    });
    const verifyRes = await verifyPartner(verifyReq as any);
    expect(verifyRes.status).toBe(200);
  });

  it('5. User browses PLASTICS in marketplace feed', async () => {
    const req = new Request('http://localhost/api/feed?category=PLASTICS', { method: 'GET' });
    const res = await getFeed(req as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.items.length).toBeGreaterThan(0);
  });

  it('6. Admin registers a Drop-Zone and generates signed QR token', async () => {
    const req = new Request('http://localhost/api/drop-zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institutionId: 'DU-CAMPUS',
        name: 'TSC Green Drop-Zone',
        acceptedCategories: ['PLASTICS', 'BOOKS', 'CLOTHES'],
      }),
    });
    const res = await createZone(req as any);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.zone.qr_token).toContain('CHOKRO-QR-');
  });

  it('7. Admin adjusts wallet credits and verified balance invariant holds', async () => {
    const adjustReq = new Request('http://localhost/api/admin/wallet/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        amount: 200.0,
        kind: 'EARN',
        reason: 'E2E verified deposit reward',
        status: 'VERIFIED',
      }),
    });
    const adjustRes = await adjustWallet(adjustReq as any);
    expect(adjustRes.status).toBe(201);

    const balReq = new Request('http://localhost/api/wallet/balance', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const balRes = await getWalletBalance(balReq as any);
    const balData = await balRes.json();
    expect(balRes.status).toBe(200);
    expect(balData.balance.verified).toBe(200);
  });
});
