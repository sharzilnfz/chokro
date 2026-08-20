// Covers admin rate-card management plus the public published and estimate
// endpoints that consume the stored rates.
import { db, rateCardEntries } from '@chokro/db';
import crypto from 'crypto';
import { POST as createRate, GET as getAdminRates } from '../app/api/admin/rate-card/route';
import { GET as getPublishedRates } from '../app/api/rate-card/published/route';
import { GET as getEstimate } from '../app/api/rate-card/estimate/route';
import { authHeaders, createTestUser, resetTestStore, tokenFor } from './test-utils';

// Rate card API: admin write gate, unit derivation, versioning, and lookups.
describe('rate card API', () => {
  // Reset store before each case.
  beforeEach(async () => {
    await resetTestStore();
  });

  // Admin rate writes are blocked for anonymous and non-admin callers.
  it('returns 401 without auth and 403 for a non-admin', async () => {
    const body = JSON.stringify({ category: 'PLASTICS', conditionBand: 'GOOD', priceBdt: 50 });
    const missing = await createRate(new Request('http://localhost/api/admin/rate-card', { method: 'POST', body }));
    const user = await createTestUser();
    const forbidden = await createRate(new Request('http://localhost/api/admin/rate-card', {
      method: 'POST', headers: authHeaders(tokenFor(user)), body,
    }));
    expect(missing.status).toBe(401);
    expect(forbidden.status).toBe(403);
  });

  // Unit is derived from the category: kg for materials, piece for e-waste.
  it('derives the unit from the category instead of accepting one', async () => {
    const admin = await createTestUser('ADMIN');
    const token = tokenFor(admin);
    const material = await createRate(new Request('http://localhost/api/admin/rate-card', {
      method: 'POST', headers: authHeaders(token),
      body: JSON.stringify({ category: 'PLASTICS', conditionBand: 'GOOD', priceBdt: 50 }),
    }));
    const eWaste = await createRate(new Request('http://localhost/api/admin/rate-card', {
      method: 'POST', headers: authHeaders(token),
      body: JSON.stringify({ category: 'E_WASTE', conditionBand: 'GOOD', priceBdt: 200 }),
    }));

    expect(material.status).toBe(201);
    expect(eWaste.status).toBe(201);
    expect((await material.json()).entry.unit).toBe('kg');
    expect((await eWaste.json()).entry.unit).toBe('piece');
  });

  // Publication picks the single latest-effective entry per key, ignoring future ones.
  it('publishes only the latest effective rate per category, condition, and unit', async () => {
    const admin = await createTestUser('ADMIN');
    const hour = 3_600_000;
    const base = [
      { price_bdt: '40.00', effective_from: new Date(Date.now() - 2 * hour) },
      { price_bdt: '55.00', effective_from: new Date(Date.now() - hour) },
      { price_bdt: '70.00', effective_from: new Date(Date.now() + hour) },
    ];
    const entries = base.map((rate) => ({
      id: crypto.randomUUID(),
      category: 'PLASTICS',
      condition_band: 'GOOD',
      unit: 'kg',
      price_bdt: rate.price_bdt,
      effective_from: rate.effective_from,
      updated_by: admin.id,
    }));
    await db.insert(rateCardEntries).values(entries);

    const published = await getPublishedRates();
    const data = await published.json();

    expect(published.status).toBe(200);
    expect(data.rates).toHaveLength(1);
    expect(data.rates[0]).toMatchObject({ price_bdt: '55.00', unit: 'kg' });
  });

  // Admins can version rates; the published set mirrors stored entries only.
  it('allows an admin to version rates and exposes stored published rates only', async () => {
    const admin = await createTestUser('ADMIN');
    const token = tokenFor(admin);
    const created = await createRate(new Request('http://localhost/api/admin/rate-card', {
      method: 'POST', headers: authHeaders(token),
      body: JSON.stringify({ category: 'PLASTICS', conditionBand: 'GOOD', priceBdt: 50 }),
    }));
    const adminRates = await getAdminRates(new Request('http://localhost/api/admin/rate-card', { headers: authHeaders(token) }));
    const published = await getPublishedRates();
    expect(created.status).toBe(201);
    expect(adminRates.status).toBe(200);
    expect((await published.json()).rates).toHaveLength(1);
  });

  // Estimate resolves a known combo and distinguishes missing params from unknown rates.
  it('estimates value for a given category and condition combo', async () => {
    const admin = await createTestUser('ADMIN');
    const token = tokenFor(admin);
    await createRate(new Request('http://localhost/api/admin/rate-card', {
      method: 'POST', headers: authHeaders(token),
      body: JSON.stringify({ category: 'PLASTICS', conditionBand: 'GOOD', priceBdt: 45 }),
    }));

    const valid = await getEstimate(new Request('http://localhost/api/rate-card/estimate?category=PLASTICS&condition=GOOD'));
    expect(valid.status).toBe(200);
    const data = await valid.json();
    expect(data.estimate).toMatchObject({
      price_bdt: '45.00',
      unit: 'kg',
      category: 'PLASTICS',
      condition_band: 'GOOD',
    });

    const missing = await getEstimate(new Request('http://localhost/api/rate-card/estimate?category=PLASTICS'));
    expect(missing.status).toBe(400);

    const notFound = await getEstimate(new Request('http://localhost/api/rate-card/estimate?category=GLASS&condition=POOR'));
    expect(notFound.status).toBe(404);
  });
});
