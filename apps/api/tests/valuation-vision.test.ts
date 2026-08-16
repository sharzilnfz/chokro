import { db, rateCardEntries } from '@chokro/db';
import crypto from 'crypto';
import { POST as classifyAndEstimate } from '../app/api/valuation/classify-and-estimate/route';
import { GET as getScans } from '../app/api/valuation/scans/route';
import { GET as getSingleScan } from '../app/api/valuation/scans/[id]/route';
import { POST as classifyV1 } from '../app/api/v1/valuation/classify-and-estimate/route';
import { GET as getScansV1 } from '../app/api/v1/valuation/scans/route';
import { GET as getSingleScanV1 } from '../app/api/v1/valuation/scans/[id]/route';
import { authHeaders, createTestUser, resetTestStore, tokenFor, routeParams } from './test-utils';

describe('AI Next-Life Scrap Vision Agent API (Member 3 F2)', () => {
  beforeEach(async () => {
    await resetTestStore();
  });

  it('classifies a scrap item, joins with DB rate card, and persists the scan', async () => {
    const admin = await createTestUser('ADMIN');
    // Setup rate card in DB
    await db.insert(rateCardEntries).values({
      id: crypto.randomUUID(),
      category: 'PLASTICS',
      condition_band: 'GOOD',
      unit: 'kg',
      price_bdt: '45.00',
      updated_by: admin.id,
    });

    const user = await createTestUser('INDIVIDUAL');
    const token = tokenFor(user);

    const req = new Request('http://localhost/api/v1/valuation/classify-and-estimate', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        promptNotes: 'discarded plastic water bottles and pet containers',
        categoryHint: 'PLASTICS',
        conditionHint: 'GOOD',
        declaredQuantity: 10,
      }),
    });

    const res = await classifyV1(req);
    expect(res.status).toBe(201);
    const body = await res.json();

    expect(body.classification).toMatchObject({
      category: 'PLASTICS',
      condition: 'GOOD',
      unit: 'kg',
      quantity: 10,
      is_ewaste_hazard: false,
    });
    expect(body.valuation).toMatchObject({
      unit_price_bdt: 45,
      total_estimated_bdt: 450,
    });
    expect(body.recommendation.next_life_path).toBe('RECYCLE');
    expect(body.scan_id).toBeDefined();
  });

  it('enforces strict E-Waste safety invariant: force RECYCLE and hazard flag', async () => {
    const admin = await createTestUser('ADMIN');
    await db.insert(rateCardEntries).values({
      id: crypto.randomUUID(),
      category: 'E_WASTE',
      condition_band: 'GOOD',
      unit: 'piece',
      price_bdt: '250.00',
      updated_by: admin.id,
    });

    const user = await createTestUser('INDIVIDUAL');
    const req = new Request('http://localhost/api/valuation/classify-and-estimate', {
      method: 'POST',
      headers: authHeaders(tokenFor(user)),
      body: JSON.stringify({
        promptNotes: 'broken motherboard, smartphone battery, electronic circuit',
      }),
    });

    const res = await classifyAndEstimate(req);
    expect(res.status).toBe(201);
    const body = await res.json();

    expect(body.classification.category).toBe('E_WASTE');
    expect(body.classification.unit).toBe('piece');
    expect(body.classification.is_ewaste_hazard).toBe(true);
    expect(body.recommendation.next_life_path).toBe('RECYCLE');
    expect(body.recommendation.reasoning_rationale).toContain('Electronic waste contains regulated heavy metals');
  });

  it('enforces dual-unit invariant (piece for APPLIANCES, kg for raw materials)', async () => {
    const applianceReq = new Request('http://localhost/api/v1/valuation/classify-and-estimate', {
      method: 'POST',
      body: JSON.stringify({
        promptNotes: 'table fan and microwave appliance in working condition',
        conditionHint: 'EXCELLENT',
      }),
    });
    const applianceRes = await classifyV1(applianceReq);
    const applianceBody = await applianceRes.json();
    expect(applianceBody.classification.unit).toBe('piece');
    expect(applianceBody.recommendation.next_life_path).toBe('RESELL');

    const metalReq = new Request('http://localhost/api/v1/valuation/classify-and-estimate', {
      method: 'POST',
      body: JSON.stringify({
        promptNotes: 'copper wires and aluminum scrap sheet',
      }),
    });
    const metalRes = await classifyV1(metalReq);
    const metalBody = await metalRes.json();
    expect(metalBody.classification.unit).toBe('kg');
  });

  it('lists historical scans and retrieves a specific scan by ID', async () => {
    const user = await createTestUser('INDIVIDUAL');
    const token = tokenFor(user);

    // Create a scan
    const createReq = new Request('http://localhost/api/v1/valuation/classify-and-estimate', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        promptNotes: 'used textbooks and novel books in good condition',
        categoryHint: 'BOOKS',
        conditionHint: 'GOOD',
      }),
    });
    const created = await (await classifyV1(createReq)).json();
    const scanId = created.scan_id;

    // List scans
    const listReq = new Request('http://localhost/api/v1/valuation/scans', {
      method: 'GET',
      headers: authHeaders(token),
    });
    const listRes = await getScansV1(listReq);
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.scans.length).toBeGreaterThanOrEqual(1);

    // Get single scan
    const singleReq = new Request(`http://localhost/api/v1/valuation/scans/${scanId}`, {
      method: 'GET',
    });
    const singleRes = await getSingleScanV1(singleReq, routeParams(scanId));
    expect(singleRes.status).toBe(200);
    const singleBody = await singleRes.json();
    expect(singleBody.scan.id).toBe(scanId);
    expect(singleBody.scan.detected_category).toBe('BOOKS');
  });
});
