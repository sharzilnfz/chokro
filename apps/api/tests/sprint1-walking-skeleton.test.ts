import { POST as createListing } from '../app/api/listings/route';
import { GET as getFeed } from '../app/api/feed/route';
import { POST as applyPartner } from '../app/api/partners/apply/route';
import { POST as verifyPartner } from '../app/api/admin/partners/route';
import { POST as createRate } from '../app/api/admin/rate-card/route';
import { POST as createZone } from '../app/api/drop-zones/route';
import { POST as adjustWallet } from '../app/api/admin/wallet/adjust/route';
import { GET as getWalletBalance } from '../app/api/wallet/balance/route';
import { authHeaders, createTestUser, resetTestStore, tokenFor } from './test-utils';

describe('Sprint 1 walking skeleton', () => {
  beforeEach(resetTestStore);

  it('runs the authenticated user, partner, admin, feed, zone, and wallet seams', async () => {
    const user = createTestUser();
    const admin = createTestUser('ADMIN');
    const userToken = tokenFor(user);
    const adminToken = tokenFor(admin);

    const rate = await createRate(new Request('http://localhost/api/admin/rate-card', {
      method: 'POST', headers: authHeaders(adminToken),
      body: JSON.stringify({ category: 'E_WASTE', conditionBand: 'GOOD', priceBdt: 300 }),
    }));
    const listing = await createListing(new Request('http://localhost/api/listings', {
      method: 'POST', headers: authHeaders(userToken),
      body: JSON.stringify({ category: 'PLASTICS', unit: 'kg', declaredWeight: 15, declaredCondition: 'EXCELLENT' }),
    }));
    const application = await applyPartner(new Request('http://localhost/api/partners/apply', {
      method: 'POST', headers: authHeaders(userToken),
      body: JSON.stringify({ orgName: 'Circular Recyclers', types: ['RECYCLER'], eWasteLicensed: true, doeLicenseDoc: 'DOE-2026.pdf' }),
    }));
    const partner = (await application.json()).partner;
    const verification = await verifyPartner(new Request('http://localhost/api/admin/partners', {
      method: 'POST', headers: authHeaders(adminToken), body: JSON.stringify({ partnerId: partner.id, status: 'VERIFIED' }),
    }));
    const feed = await getFeed(new Request('http://localhost/api/feed?category=PLASTICS'));
    const zone = await createZone(new Request('http://localhost/api/drop-zones', {
      method: 'POST', headers: authHeaders(adminToken),
      body: JSON.stringify({ institutionId: 'DU-CAMPUS', name: 'TSC Zone', acceptedCategories: ['PLASTICS'] }),
    }));
    const adjustment = await adjustWallet(new Request('http://localhost/api/admin/wallet/adjust', {
      method: 'POST', headers: authHeaders(adminToken),
      body: JSON.stringify({ userId: user.id, amount: 200, reason: 'Verified pilot adjustment' }),
    }));
    const balance = await getWalletBalance(new Request('http://localhost/api/wallet/balance', { headers: authHeaders(userToken) }));

    expect([rate.status, listing.status, application.status, verification.status, feed.status, zone.status, adjustment.status, balance.status])
      .toEqual([201, 201, 201, 200, 200, 201, 201, 200]);
    expect((await feed.json()).items).toHaveLength(1);
    expect((await balance.json()).balance.verified).toBe(200);
  });

  it('treats the signed amount as the ledger source of truth for debits', async () => {
    const user = createTestUser();
    const admin = createTestUser('ADMIN');
    const credit = await adjustWallet(new Request('http://localhost/api/admin/wallet/adjust', {
      method: 'POST', headers: authHeaders(tokenFor(admin)),
      body: JSON.stringify({ userId: user.id, amount: 200, reason: 'Verified pilot adjustment' }),
    }));
    const debit = await adjustWallet(new Request('http://localhost/api/admin/wallet/adjust', {
      method: 'POST', headers: authHeaders(tokenFor(admin)),
      body: JSON.stringify({ userId: user.id, amount: -50, reason: 'Correction after review' }),
    }));
    const balance = await getWalletBalance(new Request('http://localhost/api/wallet/balance', { headers: authHeaders(tokenFor(user)) }));
    const data = await balance.json();

    expect(credit.status).toBe(201);
    expect(debit.status).toBe(201);
    expect(data.balance).toEqual({ verified: 150, pending: 0 });
  });
});
