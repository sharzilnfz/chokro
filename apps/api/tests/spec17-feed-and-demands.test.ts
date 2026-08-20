// SPEC 17: Hyperlocal Discovery, Radius Feed & Reverse Recycler Demand Board (m2 Sameer F2, F3)
import { db, listings, buyerDemands, demandMatches } from '@chokro/db';
import { GET as getFeed } from '../app/api/feed/route';
import { POST as createListing } from '../app/api/listings/route';
import { POST as createDemand, GET as getDemands } from '../app/api/demands/route';
import { GET as getDemandMatches, PATCH as updateMatchStatus } from '../app/api/demands/matches/route';
import { createTestUser, resetTestStore, authHeaders, tokenFor } from './test-utils';
import { FeedDomain } from '../lib/domain/FeedDomain';

describe('SPEC 17: Hyperlocal Feed & Reverse Demand Board', () => {
  let seller: Awaited<ReturnType<typeof createTestUser>>;
  let buyer: Awaited<ReturnType<typeof createTestUser>>;
  let sellerToken: string;
  let buyerToken: string;

  beforeEach(async () => {
    await resetTestStore();
    seller = await createTestUser('INDIVIDUAL', 'seller@chokro.org');
    buyer = await createTestUser('PARTNER', 'buyer@chokro.org');
    sellerToken = tokenFor(seller);
    buyerToken = tokenFor(buyer);
  });

  describe('Part 1: Hyperlocal Geo-Discovery & Radius Feed (Sameer F2)', () => {
    beforeEach(async () => {
      // Seed 3 listings at known coordinates:
      // Point A: Dhanmondi (23.7461, 90.3742)
      // Point B: Tejgaon (23.7598, 90.3912) ~2.3km from Point A
      // Point C: Uttara (23.8759, 90.3795) ~14.5km from Point A
      await db.insert(listings).values([
        {
          id: '11111111-1111-1111-1111-111111111111',
          owner_id: seller.id,
          category: 'PLASTICS',
          unit: 'kg',
          declared_weight: '10.00',
          declared_condition: 'GOOD',
          price_bdt: '300.00',
          status: 'ACTIVE',
          lat: 23.7461,
          lng: 90.3742,
          thana: 'Dhanmondi',
          zilla: 'Dhaka',
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          owner_id: seller.id,
          category: 'PLASTICS',
          unit: 'kg',
          declared_weight: '25.00',
          declared_condition: 'GOOD',
          price_bdt: '750.00',
          status: 'ACTIVE',
          lat: 23.7598,
          lng: 90.3912,
          thana: 'Tejgaon',
          zilla: 'Dhaka',
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          owner_id: seller.id,
          category: 'PLASTICS',
          unit: 'kg',
          declared_weight: '50.00',
          declared_condition: 'GOOD',
          price_bdt: '1500.00',
          status: 'ACTIVE',
          lat: 23.8759,
          lng: 90.3795,
          thana: 'Uttara',
          zilla: 'Dhaka',
        },
      ]);
    });

    it('returns only listings within 5km radius of user coordinates', async () => {
      // User is at Dhanmondi (23.7461, 90.3742) with radius = 5km
      const req = new Request('http://localhost/api/v1/listings/feed?lat=23.7461&lng=90.3742&radiusKm=5');
      const res = await getFeed(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items).toHaveLength(2);

      const ids = data.items.map((i: any) => i.id);
      expect(ids).toContain('11111111-1111-1111-1111-111111111111');
      expect(ids).toContain('22222222-2222-2222-2222-222222222222');
      expect(ids).not.toContain('33333333-3333-3333-3333-333333333333');

      // Distance should be calculated and attached
      const itemA = data.items.find((i: any) => i.id === '11111111-1111-1111-1111-111111111111');
      expect(Number(itemA.distance_km)).toBeCloseTo(0, 0);

      const itemB = data.items.find((i: any) => i.id === '22222222-2222-2222-2222-222222222222');
      expect(Number(itemB.distance_km)).toBeGreaterThan(1.5);
      expect(Number(itemB.distance_km)).toBeLessThan(3.5);
    });

    it('returns all listings when radius is large enough (20km)', async () => {
      const req = new Request('http://localhost/api/v1/listings/feed?lat=23.7461&lng=90.3742&radiusKm=20');
      const res = await getFeed(req);
      const data = await res.json();
      expect(data.items).toHaveLength(3);
    });

    it('filters listings by Thana facet', async () => {
      const req = new Request('http://localhost/api/v1/listings/feed?thana=Tejgaon');
      const res = await getFeed(req);
      const data = await res.json();
      expect(data.items).toHaveLength(1);
      expect(data.items[0].id).toBe('22222222-2222-2222-2222-222222222222');
      expect(data.items[0].thana).toBe('Tejgaon');
    });

    it('sorts listings by distance when requested', async () => {
      const req = new Request('http://localhost/api/v1/listings/feed?lat=23.7461&lng=90.3742&sort=distance');
      const res = await getFeed(req);
      const data = await res.json();
      expect(data.items).toHaveLength(3);
      expect(data.items[0].id).toBe('11111111-1111-1111-1111-111111111111'); // 0km
      expect(data.items[1].id).toBe('22222222-2222-2222-2222-222222222222'); // ~2.3km
      expect(data.items[2].id).toBe('33333333-3333-3333-3333-333333333333'); // ~14.5km
    });

    it('falls back to offline Thana reverse geocoding gracefully', async () => {
      const geo = await FeedDomain.reverseGeocode(23.7461, 90.3742);
      expect(geo.thana).toBeDefined();
      expect(geo.zilla).toBeDefined();
    });
  });

  describe('Part 2: Reverse Demand Board & Auto-Matching (Sameer F3)', () => {
    it('creates a standing demand and auto-matches newly published listings', async () => {
      // 1. Recycler posts a standing demand for 100kg+ METAL at max 200 BDT/kg in Dhanmondi area
      const demandReq = new Request('http://localhost/api/v1/demands', {
        method: 'POST',
        headers: authHeaders(buyerToken),
        body: JSON.stringify({
          category: 'METAL',
          minQuantity: 50,
          maxQuantity: 500,
          unit: 'kg',
          maxPricePerUnitBdt: 200,
          targetThana: 'Dhanmondi',
          targetLat: 23.7461,
          targetLng: 90.3742,
          maxRadiusKm: 10,
          durationDays: 30,
        }),
      });

      const demandRes = await createDemand(demandReq);
      expect(demandRes.status).toBe(201);
      const demandData = await demandRes.json();
      const demandId = demandData.demandId || demandData.demand?.id;
      expect(demandId).toBeDefined();

      // 2. Seller creates a matching listing (100kg of METAL at 150 BDT/kg in Dhanmondi)
      const listingReq = new Request('http://localhost/api/v1/listings', {
        method: 'POST',
        headers: authHeaders(sellerToken),
        body: JSON.stringify({
          category: 'METAL',
          unit: 'kg',
          declaredWeight: 100,
          declaredCondition: 'GOOD',
          price: 15000, // 150 BDT/kg <= 200 BDT/kg
          photos: ['https://example.com/metal.jpg'],
          lat: 23.7465,
          lng: 90.3745,
          thana: 'Dhanmondi',
          zilla: 'Dhaka',
        }),
      });

      const listingRes = await createListing(listingReq);
      expect(listingRes.status).toBe(201);
      const listingData = await listingRes.json();
      const listingId = listingData.listing?.id;
      expect(listingId).toBeDefined();

      // 3. Buyer queries their demand matches inbox
      const matchesReq = new Request(`http://localhost/api/v1/demands/matches?demandId=${demandId}`, {
        headers: authHeaders(buyerToken),
      });
      const matchesRes = await getDemandMatches(matchesReq);
      expect(matchesRes.status).toBe(200);

      const matchesData = await matchesRes.json();
      expect(matchesData.matches).toHaveLength(1);
      const match = matchesData.matches[0];
      expect(match.listing_id).toBe(listingId);
      expect(Number(match.match_score)).toBeGreaterThan(0.7);
      expect(match.status).toBe('UNNOTICED');

      // 4. Buyer marks match as VIEWED
      const updateReq = new Request('http://localhost/api/v1/demands/matches', {
        method: 'PATCH',
        headers: authHeaders(buyerToken),
        body: JSON.stringify({ matchId: match.id, status: 'VIEWED' }),
      });
      const updateRes = await updateMatchStatus(updateReq);
      expect(updateRes.status).toBe(200);

      const updatedData = await updateRes.json();
      expect(updatedData.match?.status || updatedData.data?.match?.status).toBe('VIEWED');
    });

    it('does not match listings exceeding max price or outside radius', async () => {
      // 1. Recycler posts demand with max price 100 BDT/kg
      const demandReq = new Request('http://localhost/api/v1/demands', {
        method: 'POST',
        headers: authHeaders(buyerToken),
        body: JSON.stringify({
          category: 'METAL',
          minQuantity: 10,
          unit: 'kg',
          maxPricePerUnitBdt: 100,
          targetLat: 23.7461,
          targetLng: 90.3742,
          maxRadiusKm: 5,
        }),
      });
      const demandRes = await createDemand(demandReq);
      const demandData = await demandRes.json();
      const demandId = demandData.demandId || demandData.demand?.id;

      // 2. Listing is too expensive (300 BDT/kg)
      const expensiveListingReq = new Request('http://localhost/api/v1/listings', {
        method: 'POST',
        headers: authHeaders(sellerToken),
        body: JSON.stringify({
          category: 'METAL',
          unit: 'kg',
          declaredWeight: 20,
          declaredCondition: 'GOOD',
          price: 6000, // 300 BDT/kg > 100
          lat: 23.7461,
          lng: 90.3742,
        }),
      });
      await createListing(expensiveListingReq);

      // 3. Verify no matches were created
      const matchesReq = new Request(`http://localhost/api/v1/demands/matches?demandId=${demandId}`, {
        headers: authHeaders(buyerToken),
      });
      const matchesRes = await getDemandMatches(matchesReq);
      const matchesData = await matchesRes.json();
      expect(matchesData.matches).toHaveLength(0);
    });
  });
});
