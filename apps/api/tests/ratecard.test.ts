import { memoryStore } from '@chokro/db';
import crypto from 'crypto';
import { POST as createRate, GET as getAdminRates } from '../app/api/admin/rate-card/route';
import { GET as getPublishedRates } from '../app/api/rate-card/published/route';
import { GET as getEstimate } from '../app/api/rate-card/estimate/route';
import { authHeaders, createTestUser, resetTestStore, tokenFor } from './test-utils';

describe('rate card API', () => {
  beforeEach(resetTestStore);

  it('returns 401 without auth and 403 for a non-admin', async () => {
    const body = JSON.stringify({ category: 'PLASTICS', conditionBand: 'GOOD', priceBdt: 50 });
    const missing = await createRate(new Request('http://localhost/api/admin/rate-card', { method: 'POST', body }));
    const user = createTestUser();
    const forbidden = await createRate(new Request('http://localhost/api/admin/rate-card', {
      method: 'POST', headers: authHeaders(tokenFor(user)), body,
    }));
    expect(missing.status).toBe(401);
    expect(forbidden.status).toBe(403);
  });

  it('derives the unit from the category instead of accepting one', async () => {
    const admin = createTestUser('ADMIN');
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

  it('publishes only the latest effective rate per category, condition, and unit', async () => {
    const admin = createTestUser('ADMIN');
    const hour = 3_600_000;
    const base = [
      { price_bdt: '40', effective_from: new Date(Date.now() - 2 * hour) },
      { price_bdt: '55', effective_from: new Date(Date.now() - hour) },
      { price_bdt: '70', effective_from: new Date(Date.now() + hour) },
    ];
    for (const rate of base) {
      memoryStore.rateCardEntries.push({
        id: crypto.randomUUID(), category: 'PLASTICS', condition_band: 'GOOD', unit: 'kg',
        price_bdt: rate.price_bdt, effective_from: rate.effective_from, updated_by: admin.id,
      });
    }

    const published = await getPublishedRates();
    const data = await published.json();

    expect(published.status).toBe(200);
    expect(data.rates).toHaveLength(1);
    expect(data.rates[0]).toMatchObject({ price_bdt: '55', unit: 'kg' });
  });

  it('allows an admin to version rates and exposes stored published rates only', async () => {
    const admin = createTestUser('ADMIN');
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

  it('estimates value for a given category and condition combo', async () => {
    const admin = createTestUser('ADMIN');
    const token = tokenFor(admin);
    await createRate(new Request('http://localhost/api/admin/rate-card', {
      method: 'POST', headers: authHeaders(token),
      body: JSON.stringify({ category: 'PLASTICS', conditionBand: 'GOOD', priceBdt: 45 }),
    }));

    const valid = await getEstimate(new Request('http://localhost/api/rate-card/estimate?category=PLASTICS&condition=GOOD'));
    expect(valid.status).toBe(200);
    const data = await valid.json();
    expect(data.estimate).toMatchObject({
      price_bdt: '45',
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
