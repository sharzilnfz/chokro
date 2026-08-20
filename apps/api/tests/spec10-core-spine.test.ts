import crypto from 'crypto';
import { db, rateCardEntries, dropZones, auctionLots, auctionBids } from '@chokro/db';
import { POST as classifyAndEstimate } from '../app/api/valuation/classify-and-estimate/route';
import { GET as resolveDropZone } from '../app/api/drop-zones/resolve/route';
import { ValuationDomain } from '../lib/domain/ValuationDomain';
import { evidenceStorage } from '../lib/storage/evidence';
import { withDb } from '../lib/repos/seam';
import { ConflictError, BadRequestError, DatabaseUnavailableError, routeError } from '../lib/database';
import { authHeaders, createTestUser, resetTestStore, tokenFor } from './test-utils';

describe('SPEC 10 — Core Spine & Correctness Debt (Ticket 01a)', () => {
  beforeEach(async () => {
    await resetTestStore();
  });

  describe('1. Rate Card Provenance & Fallback Removal', () => {
    it('returns published price when matching rate card entry exists', async () => {
      const admin = await createTestUser('ADMIN');
      await db.insert(rateCardEntries).values({
        id: crypto.randomUUID(),
        category: 'PAPER',
        condition_band: 'GOOD',
        unit: 'kg',
        price_bdt: '28.00',
        updated_by: admin.id,
      });

      const estimate = await ValuationDomain.estimateRate({
        category: 'PAPER',
        condition: 'GOOD',
        quantity: 5,
      });

      expect(estimate).not.toBeNull();
      expect(estimate?.unit_price).toBe(28);
      expect(estimate?.total_bdt).toBe(140);
    });

    it('returns has_published_rate: false and unit_price: 0 when no rate card matches — no invented constant', async () => {
      // No rate card entry inserted for GLASS / FAIR
      const estimate = await ValuationDomain.estimateRate({
        category: 'GLASS',
        condition: 'FAIR',
        quantity: 10,
      });
      expect(estimate).toBeNull();

      const user = await createTestUser('INDIVIDUAL');
      const req = new Request('http://localhost/api/valuation/classify-and-estimate', {
        method: 'POST',
        headers: authHeaders(tokenFor(user)),
        body: JSON.stringify({
          promptNotes: 'broken glass bottles and jars',
          categoryHint: 'GLASS',
          conditionHint: 'FAIR',
          declaredQuantity: 5,
        }),
      });

      const res = await classifyAndEstimate(req);
      expect(res.status).toBe(201);
      const body = await res.json();

      expect(body.classification.category).toBe('GLASS');
      expect(body.valuation.has_published_rate).toBe(false);
      expect(body.valuation.unit_price_bdt).toBe(0);
      expect(body.valuation.total_estimated_bdt).toBe(0);
      expect(body.valuation.rate_card_entry_id).toBeNull();
    });
  });

  describe('2. Bounded Haversine Drop-Zone Resolution by Location', () => {
    it('returns nearest zone when within proximity and returns 404 when beyond radius', async () => {
      const user = await createTestUser('INDIVIDUAL');
      const token = tokenFor(user);

      // Seed BRACU Zone in Badda (23.774, 90.425)
      await db.insert(dropZones).values({
        id: crypto.randomUUID(),
        institution_id: 'bracu',
        name: 'BRACU Cafeteria Bin',
        geo_location: { lat: 23.774, lng: 90.425 },
        qr_token: 'valid_token_bracu',
        accepted_categories: ['PLASTICS', 'PAPER'],
        status: 'ACTIVE',
      });

      // Seed BUET Zone in Palashi (23.726, 90.392)
      await db.insert(dropZones).values({
        id: crypto.randomUUID(),
        institution_id: 'buet',
        name: 'BUET Civil Dept Bin',
        geo_location: { lat: 23.726, lng: 90.392 },
        qr_token: 'valid_token_buet',
        accepted_categories: ['PLASTICS', 'METAL'],
        status: 'ACTIVE',
      });

      // Query standing near BRACU (23.775, 90.426) — ~150 meters away
      const nearbyReq = new Request('http://localhost/api/drop-zones/resolve?lat=23.775&lng=90.426', {
        method: 'GET',
        headers: authHeaders(token),
      });
      const nearbyRes = await resolveDropZone(nearbyReq);
      expect(nearbyRes.status).toBe(200);
      const nearbyBody = await nearbyRes.json();
      expect(nearbyBody.zone.name).toBe('BRACU Cafeteria Bin');

      // Query standing far away in Sylhet / outside Dhaka (24.894, 91.868)
      const farReq = new Request('http://localhost/api/drop-zones/resolve?lat=24.894&lng=91.868', {
        method: 'GET',
        headers: authHeaders(token),
      });
      const farRes = await resolveDropZone(farReq);
      expect(farRes.status).toBe(404);
    });
  });

  describe('3. Retrievable Stored Evidence Boundary', () => {
    it('persists evidence binary to storage and creates retrievable database record', async () => {
      const user = await createTestUser('INDIVIDUAL');
      const imageBuffer = Buffer.from('fake-evidence-image-binary-payload-data');

      const stored = await evidenceStorage.store({
        buffer: imageBuffer,
        mimeType: 'image/jpeg',
        uploaderId: user.id,
      });

      expect(stored.id).toBeDefined();
      expect(stored.url).toContain('/uploads/evidence/');
      expect(stored.byteSize).toBe(imageBuffer.length);
      expect(stored.uploaderId).toBe(user.id);

      const retrieved = await evidenceStorage.findById(stored.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.url).toBe(stored.url);
      expect(retrieved?.byteSize).toBe(imageBuffer.length);
    });
  });

  describe('4. Bid Sequence Serialisation & Unique Constraint', () => {
    it('enforces unique (lot_id, bid_number) constraint and throws ConflictError on collision', async () => {
      const seller = await createTestUser('INDIVIDUAL');
      const bidder1 = await createTestUser('INDIVIDUAL');
      const bidder2 = await createTestUser('INDIVIDUAL');

      const lotId = crypto.randomUUID();
      await db.insert(auctionLots).values({
        id: lotId,
        title: '500kg Copper Cables',
        category: 'METAL',
        quantity_kg: '500.00',
        starting_price_bdt: '250000.00',
        reserve_price_bdt: '300000.00',
        status: 'LIVE',
        opens_at: new Date(Date.now() - 3600000),
        closes_at: new Date(Date.now() + 3600000),
        created_by: seller.id,
      });

      // Insert first bid with bid_number = 1
      await db.insert(auctionBids).values({
        id: crypto.randomUUID(),
        lot_id: lotId,
        bidder_user_id: bidder1.id,
        amount_bdt: '260000.00',
        bid_number: 1,
      });

      // Attempting to insert a duplicate bid_number = 1 on the same lot must throw ConflictError
      await expect(
        withDb(async (instance) => {
          return instance.insert(auctionBids).values({
            id: crypto.randomUUID(),
            lot_id: lotId,
            bidder_user_id: bidder2.id,
            amount_bdt: '270000.00',
            bid_number: 1,
          });
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('5. Persistence Seam Error Taxonomy', () => {
    it('maps unique violations to 409, check violations to 400, and database failures to 503', () => {
      const conflictRes = routeError(new ConflictError('Duplicate key'));
      expect(conflictRes.status).toBe(409);

      const badReqRes = routeError(new BadRequestError('Constraint failed'));
      expect(badReqRes.status).toBe(400);

      const unavailRes = routeError(new DatabaseUnavailableError());
      expect(unavailRes.status).toBe(503);
    });
  });
});
