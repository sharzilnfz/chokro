import { db, rateCardEntries } from '@chokro/db';
import crypto from 'crypto';
import { GET as getEstimate } from '../app/api/rate-card/estimate/route';
import { GET as getPublishedRates } from '../app/api/rate-card/published/route';
import { GET as getBenchmarks } from '../app/api/rate-card/benchmarks/route';
import { POST as syncBenchmarks } from '../app/api/rate-card/benchmarks/sync/route';
import { GET as getEstimateV1 } from '../app/api/v1/rate-card/estimate/route';
import { GET as getPublishedV1 } from '../app/api/v1/rate-card/published/route';
import { GET as getBenchmarksV1 } from '../app/api/v1/rate-card/benchmarks/route';
import { POST as syncBenchmarksV1 } from '../app/api/v1/rate-card/benchmarks/sync/route';
import { createTestUser, resetTestStore, tokenFor, authHeaders } from './test-utils';

describe('Market-Benchmarked Valuation & Rate Card API (Member 3 F1)', () => {
  beforeEach(async () => {
    await resetTestStore();
  });

  it('guards benchmark sync behind admin auth', async () => {
    const syncUrl = 'http://localhost/api/rate-card/benchmarks/sync';

    const unauthenticated = await syncBenchmarks(new Request(syncUrl, { method: 'POST' }));
    expect(unauthenticated.status).toBe(401);

    const member = await createTestUser('INDIVIDUAL');
    const forbidden = await syncBenchmarks(
      new Request(syncUrl, { method: 'POST', headers: authHeaders(tokenFor(member)) }),
    );
    expect(forbidden.status).toBe(403);

    const admin = await createTestUser('ADMIN');
    const allowed = await syncBenchmarks(
      new Request(syncUrl, { method: 'POST', headers: authHeaders(tokenFor(admin)) }),
    );
    expect(allowed.status).toBe(200);
    const body = await allowed.json();
    expect(body.count).toBeGreaterThanOrEqual(8);
  });

  it('syncs commodity market benchmarks from feed to database', async () => {
    const admin = await createTestUser('ADMIN');
    const syncReq = new Request('http://localhost/api/v1/rate-card/benchmarks/sync', {
      method: 'POST',
      headers: authHeaders(tokenFor(admin)),
      body: JSON.stringify({ fx_rate: 122.50 }),
    });
    const syncRes = await syncBenchmarksV1(syncReq);
    expect(syncRes.status).toBe(200);
    const syncBody = await syncRes.json();
    expect(syncBody.count).toBeGreaterThanOrEqual(8);
    expect(syncBody.benchmarks.some((b: any) => b.category === 'PLASTICS')).toBe(true);

    const listRes = await getBenchmarksV1();
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.benchmarks.length).toBeGreaterThanOrEqual(8);
  });

  it('calculates valuation estimate with quantity and attaches market benchmark drift', async () => {
    const admin = await createTestUser('ADMIN');
    // Setup rate in DB
    await db.insert(rateCardEntries).values({
      id: crypto.randomUUID(),
      category: 'PLASTICS',
      condition_band: 'GOOD',
      unit: 'kg',
      price_bdt: '45.00',
      effective_from: new Date(Date.now() - 1000),
      updated_by: admin.id,
    });

    // Sync benchmarks
    await syncBenchmarksV1(new Request('http://localhost/api/v1/rate-card/benchmarks/sync', {
      method: 'POST',
      headers: authHeaders(tokenFor(admin)),
    }));

    const estimateReq = new Request('http://localhost/api/v1/rate-card/estimate?category=PLASTICS&condition=GOOD&weight=12.5');
    const estimateRes = await getEstimateV1(estimateReq);
    expect(estimateRes.status).toBe(200);
    const body = await estimateRes.json();

    expect(body.estimate).toMatchObject({
      category: 'PLASTICS',
      condition_band: 'GOOD',
      unit: 'kg',
      price_bdt: '45.00',
      quantity: 12.5,
      total_bdt: 562.5,
    });
    expect(body.estimate.market_benchmark).toBeDefined();
    expect(body.estimate.market_benchmark.drift_status).toBeDefined();
    expect(body.estimate.market_benchmark.benchmark_bdt).toBeGreaterThan(0);
  });

  it('returns published rates enriched with commodity market benchmarks', async () => {
    const admin = await createTestUser('ADMIN');
    await db.insert(rateCardEntries).values([
      {
        id: crypto.randomUUID(),
        category: 'METAL',
        condition_band: 'GOOD',
        unit: 'kg',
        price_bdt: '110.00',
        effective_from: new Date(Date.now() - 1000),
        updated_by: admin.id,
      },
      {
        id: crypto.randomUUID(),
        category: 'E_WASTE',
        condition_band: 'GOOD',
        unit: 'piece',
        price_bdt: '250.00',
        effective_from: new Date(Date.now() - 1000),
        updated_by: admin.id,
      },
    ]);


    // Sync benchmarks
    await syncBenchmarks(new Request('http://localhost/api/rate-card/benchmarks/sync', {
      method: 'POST',
      headers: authHeaders(tokenFor(admin)),
    }));

    const publishedRes = await getPublishedV1();
    expect(publishedRes.status).toBe(200);
    const body = await publishedRes.json();

    expect(body.rates.length).toBe(2);
    const metalRate = body.rates.find((r: any) => r.category === 'METAL');
    expect(metalRate).toBeDefined();
    expect(metalRate.market_benchmark_bdt).toBeDefined();
    expect(metalRate.drift_badge).toBeDefined();
  });
});
