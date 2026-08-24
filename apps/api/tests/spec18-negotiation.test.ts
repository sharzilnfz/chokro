// SPEC 18: Binding Counter-Offer Negotiation Engine (m2 Sameer F4)
import { db, listings, negotiationThreads, negotiationOffers, pickupOrders, eq } from '@chokro/db';
import { POST as createThreadRoute, GET as listThreadsRoute } from '../app/api/negotiations/route';
import { GET as getThreadRoute } from '../app/api/negotiations/[id]/route';
import { POST as submitOfferRoute } from '../app/api/negotiations/[id]/offer/route';
import { POST as acceptOfferRoute } from '../app/api/negotiations/[id]/accept/route';
import { POST as rejectOfferRoute } from '../app/api/negotiations/[id]/reject/route';
import { createTestUser, resetTestStore, authHeaders, tokenFor, routeParams } from './test-utils';

describe('SPEC 18: Binding Counter-Offer Negotiation Engine', () => {
  let seller: Awaited<ReturnType<typeof createTestUser>>;
  let buyerA: Awaited<ReturnType<typeof createTestUser>>;
  let buyerB: Awaited<ReturnType<typeof createTestUser>>;
  let sellerToken: string;
  let buyerAToken: string;
  let buyerBToken: string;
  let listingId: string;

  beforeEach(async () => {
    await resetTestStore();
    seller = await createTestUser('INDIVIDUAL', 'seller@chokro.org');
    buyerA = await createTestUser('PARTNER', 'buyerA@chokro.org');
    buyerB = await createTestUser('PARTNER', 'buyerB@chokro.org');
    sellerToken = tokenFor(seller);
    buyerAToken = tokenFor(buyerA);
    buyerBToken = tokenFor(buyerB);

    // Seed an active listing
    const [listing] = await db.insert(listings).values({
      owner_id: seller.id,
      category: 'METAL',
      unit: 'kg',
      declared_weight: '100.00',
      declared_condition: 'GOOD',
      price_bdt: '15000.00', // Asking 150 BDT/kg
      status: 'ACTIVE',
      lat: 23.7461,
      lng: 90.3742,
      thana: 'Dhanmondi',
      zilla: 'Dhaka',
    }).returning();
    listingId = listing.id;
  });

  describe('Part 1: Thread Creation & Initial Offer', () => {
    it('creates a negotiation thread with initial pending offer and 24h TTL', async () => {
      const req = new Request('http://localhost/api/v1/negotiations/threads', {
        method: 'POST',
        headers: authHeaders(buyerAToken),
        body: JSON.stringify({
          listingId,
          initialOfferAmountBdt: 12000,
          offeredQuantity: 100,
          unit: 'kg',
          proposedPickupAt: new Date(Date.now() + 86400000).toISOString(),
          notes: 'Can pick up tomorrow with our truck',
        }),
      });

      const res = await createThreadRoute(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      const thread = data.thread;
      expect(thread.id).toBeDefined();
      expect(thread.listing_id).toBe(listingId);
      expect(thread.buyer_id).toBe(buyerA.id);
      expect(thread.seller_id).toBe(seller.id);
      expect(thread.status).toBe('OPEN');
      expect(thread.offers).toHaveLength(1);

      const offer = thread.offers[0];
      expect(offer.status).toBe('PENDING');
      expect(Number(offer.offer_amount_bdt)).toBe(12000);
      expect(Number(offer.offered_quantity)).toBe(100);
      expect(offer.unit).toBe('kg');
      expect(offer.notes).toBe('Can pick up tomorrow with our truck');

      const expiresAt = new Date(offer.expires_at).getTime();
      const now = Date.now();
      expect(expiresAt).toBeGreaterThan(now + 23 * 3600_000);
      expect(expiresAt).toBeLessThanOrEqual(now + 24 * 3600_000 + 5000);
    });

    it('rejects thread creation by the listing owner', async () => {
      const req = new Request('http://localhost/api/v1/negotiations/threads', {
        method: 'POST',
        headers: authHeaders(sellerToken),
        body: JSON.stringify({
          listingId,
          initialOfferAmountBdt: 10000,
          offeredQuantity: 100,
        }),
      });

      const res = await createThreadRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Listing owner cannot negotiate');
    });

    it('rejects negotiation on inactive listings', async () => {
      await db.update(listings).set({ status: 'CANCELLED' }).where(eq(listings.id, listingId));

      const req = new Request('http://localhost/api/v1/negotiations/threads', {
        method: 'POST',
        headers: authHeaders(buyerAToken),
        body: JSON.stringify({
          listingId,
          initialOfferAmountBdt: 10000,
          offeredQuantity: 100,
        }),
      });

      const res = await createThreadRoute(req);
      expect(res.status).toBe(400);
    });
  });

  describe('Part 2: Single Active Offer Invariant & Counter-Offer Supersession', () => {
    let threadId: string;

    beforeEach(async () => {
      const req = new Request('http://localhost/api/v1/negotiations/threads', {
        method: 'POST',
        headers: authHeaders(buyerAToken),
        body: JSON.stringify({
          listingId,
          initialOfferAmountBdt: 12000,
          offeredQuantity: 100,
          unit: 'kg',
        }),
      });
      const res = await createThreadRoute(req);
      const data = await res.json();
      threadId = data.thread.id;
    });

    it('supersedes previous pending offer when counter-offer is submitted', async () => {
      // Seller counters with 14000 BDT
      const counterReq1 = new Request(`http://localhost/api/v1/negotiations/${threadId}/offer`, {
        method: 'POST',
        headers: authHeaders(sellerToken),
        body: JSON.stringify({
          offerAmountBdt: 14000,
          offeredQuantity: 100,
          notes: 'Best I can do is 14000',
        }),
      });
      const counterRes1 = await submitOfferRoute(counterReq1, routeParams(threadId));
      expect(counterRes1.status).toBe(201);

      // Verify thread offers in DB: first offer is SUPERSEDED, second is PENDING
      const offers1 = await db
        .select()
        .from(negotiationOffers)
        .where(eq(negotiationOffers.thread_id, threadId))
        .orderBy(negotiationOffers.created_at);

      expect(offers1).toHaveLength(2);
      expect(offers1[0].status).toBe('SUPERSEDED');
      expect(Number(offers1[0].offer_amount_bdt)).toBe(12000);
      expect(offers1[1].status).toBe('PENDING');
      expect(Number(offers1[1].offer_amount_bdt)).toBe(14000);

      // Buyer counters again with 13000 BDT
      const counterReq2 = new Request(`http://localhost/api/v1/negotiations/${threadId}/offer`, {
        method: 'POST',
        headers: authHeaders(buyerAToken),
        body: JSON.stringify({
          offerAmountBdt: 13000,
          offeredQuantity: 100,
          notes: 'Meet in the middle at 13000',
        }),
      });
      const counterRes2 = await submitOfferRoute(counterReq2, routeParams(threadId));
      expect(counterRes2.status).toBe(201);

      // Verify thread offers in DB: only the 3rd offer is PENDING
      const offers2 = await db
        .select()
        .from(negotiationOffers)
        .where(eq(negotiationOffers.thread_id, threadId))
        .orderBy(negotiationOffers.created_at);

      expect(offers2).toHaveLength(3);
      expect(offers2[0].status).toBe('SUPERSEDED');
      expect(offers2[1].status).toBe('SUPERSEDED');
      expect(offers2[2].status).toBe('PENDING');
      expect(Number(offers2[2].offer_amount_bdt)).toBe(13000);

      // Enforce Single Active Offer Invariant: exactly 1 PENDING offer
      const pendingOffers = offers2.filter((o) => o.status === 'PENDING');
      expect(pendingOffers).toHaveLength(1);
    });

    it('rejects offer submissions from non-participants', async () => {
      const nonParticipantReq = new Request(`http://localhost/api/v1/negotiations/${threadId}/offer`, {
        method: 'POST',
        headers: authHeaders(buyerBToken),
        body: JSON.stringify({
          offerAmountBdt: 13500,
          offeredQuantity: 100,
        }),
      });
      const res = await submitOfferRoute(nonParticipantReq, routeParams(threadId));
      expect(res.status).toBe(403);
    });
  });

  describe('Part 3: 24-Hour TTL Expiration Handling', () => {
    it('lazily expires past-due pending offer and prevents acceptance', async () => {
      // 1. Buyer creates thread
      const threadReq = new Request('http://localhost/api/v1/negotiations/threads', {
        method: 'POST',
        headers: authHeaders(buyerAToken),
        body: JSON.stringify({
          listingId,
          initialOfferAmountBdt: 12000,
          offeredQuantity: 100,
        }),
      });
      const threadRes = await createThreadRoute(threadReq);
      const { thread } = await threadRes.json();

      // 2. Manually set offer expires_at to the past (simulating 24h elapsed)
      const pastDate = new Date(Date.now() - 3600_000);
      await db
        .update(negotiationOffers)
        .set({ expires_at: pastDate })
        .where(eq(negotiationOffers.thread_id, thread.id));

      // 3. Seller attempts to accept expired offer -> 410 Gone / Expired
      const acceptReq = new Request(`http://localhost/api/v1/negotiations/${thread.id}/accept`, {
        method: 'POST',
        headers: authHeaders(sellerToken),
      });
      const acceptRes = await acceptOfferRoute(acceptReq, routeParams(thread.id));
      expect(acceptRes.status).toBe(410);

      // 4. Verify offer status in DB was updated to EXPIRED
      const [offer] = await db
        .select()
        .from(negotiationOffers)
        .where(eq(negotiationOffers.thread_id, thread.id));
      expect(offer.status).toBe('EXPIRED');

      // 5. Query thread details and assert offer is reported as EXPIRED
      const getReq = new Request(`http://localhost/api/v1/negotiations/${thread.id}`, {
        headers: authHeaders(buyerAToken),
      });
      const getRes = await getThreadRoute(getReq, routeParams(thread.id));
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.thread.offers[0].status).toBe('EXPIRED');
    });
  });

  describe('Part 4: Atomic Binding Acceptance & Multi-Thread Resolution (Seam Verification)', () => {
    it('accepts offer, completes thread, locks listing to MATCHED, supersedes rival buyer threads, and spawns pickup order', async () => {
      // 1. Buyer A opens thread with offer of 13000 BDT
      const threadAReq = new Request('http://localhost/api/v1/negotiations/threads', {
        method: 'POST',
        headers: authHeaders(buyerAToken),
        body: JSON.stringify({
          listingId,
          initialOfferAmountBdt: 13000,
          offeredQuantity: 100,
          unit: 'kg',
          proposedPickupAt: new Date(Date.now() + 48 * 3600_000).toISOString(),
          notes: 'Buyer A pickup note',
        }),
      });
      const resA = await createThreadRoute(threadAReq);
      const threadAId = (await resA.json()).thread.id;

      // 2. Buyer B opens competing thread on same listing with offer of 14000 BDT
      const threadBReq = new Request('http://localhost/api/v1/negotiations/threads', {
        method: 'POST',
        headers: authHeaders(buyerBToken),
        body: JSON.stringify({
          listingId,
          initialOfferAmountBdt: 14000,
          offeredQuantity: 100,
          unit: 'kg',
          notes: 'Buyer B competing offer',
        }),
      });
      const resB = await createThreadRoute(threadBReq);
      const threadBId = (await resB.json()).thread.id;

      // 3. Proposer (Buyer A) cannot accept their own offer
      const selfAcceptReq = new Request(`http://localhost/api/v1/negotiations/${threadAId}/accept`, {
        method: 'POST',
        headers: authHeaders(buyerAToken),
      });
      const selfAcceptRes = await acceptOfferRoute(selfAcceptReq, routeParams(threadAId));
      expect(selfAcceptRes.status).toBe(400);

      // 4. Seller accepts Buyer A's offer
      const acceptReq = new Request(`http://localhost/api/v1/negotiations/${threadAId}/accept`, {
        method: 'POST',
        headers: authHeaders(sellerToken),
      });
      const acceptRes = await acceptOfferRoute(acceptReq, routeParams(threadAId));
      expect(acceptRes.status).toBe(200);

      const acceptData = await acceptRes.json();
      expect(acceptData.offer.status).toBe('ACCEPTED');
      expect(acceptData.thread.status).toBe('COMPLETED');
      expect(acceptData.pickupOrder).toBeDefined();
      expect(acceptData.pickupOrder.listing_id).toBe(listingId);
      expect(acceptData.pickupOrder.customer_id).toBe(buyerA.id);

      // 5. Verify Listing status is flipped to MATCHED
      const [listingInDb] = await db.select().from(listings).where(eq(listings.id, listingId));
      expect(listingInDb.status).toBe('MATCHED');

      // 6. Verify Thread A is COMPLETED and its offer is ACCEPTED
      const [threadAInDb] = await db.select().from(negotiationThreads).where(eq(negotiationThreads.id, threadAId));
      const [offerAInDb] = await db.select().from(negotiationOffers).where(eq(negotiationOffers.thread_id, threadAId));
      expect(threadAInDb.status).toBe('COMPLETED');
      expect(offerAInDb.status).toBe('ACCEPTED');

      // 7. Verify Competing Thread B is closed and marked SUPERSEDED_BY_SALE
      const [threadBInDb] = await db.select().from(negotiationThreads).where(eq(negotiationThreads.id, threadBId));
      const [offerBInDb] = await db.select().from(negotiationOffers).where(eq(negotiationOffers.thread_id, threadBId));
      expect(threadBInDb.status).toBe('SUPERSEDED_BY_SALE');
      expect(offerBInDb.status).toBe('SUPERSEDED_BY_SALE');

      // 8. Verify pickup order was spawned in pickup_orders table
      const [pickupInDb] = await db
        .select()
        .from(pickupOrders)
        .where(eq(pickupOrders.listing_id, listingId));
      expect(pickupInDb).toBeDefined();
      expect(pickupInDb.customer_id).toBe(buyerA.id);
      expect(pickupInDb.status).toBe('REQUESTED');
      expect(pickupInDb.notes).toContain('13000');
      expect(pickupInDb.notes).toContain('100');
    });
  });

  describe('Part 5: Rejection Flow', () => {
    it('allows counterparty to reject pending offer while leaving thread open for counter-offers', async () => {
      // 1. Buyer creates thread with initial offer
      const threadReq = new Request('http://localhost/api/v1/negotiations/threads', {
        method: 'POST',
        headers: authHeaders(buyerAToken),
        body: JSON.stringify({
          listingId,
          initialOfferAmountBdt: 10000,
          offeredQuantity: 100,
        }),
      });
      const threadRes = await createThreadRoute(threadReq);
      const threadId = (await threadRes.json()).thread.id;

      // 2. Seller rejects offer with a reason
      const rejectReq = new Request(`http://localhost/api/v1/negotiations/${threadId}/reject`, {
        method: 'POST',
        headers: authHeaders(sellerToken),
        body: JSON.stringify({ reason: 'Price is too low for this grade of metal' }),
      });
      const rejectRes = await rejectOfferRoute(rejectReq, routeParams(threadId));
      expect(rejectRes.status).toBe(200);

      const rejectData = await rejectRes.json();
      expect(rejectData.offer.status).toBe('REJECTED');

      // 3. Thread is still OPEN
      const [threadInDb] = await db.select().from(negotiationThreads).where(eq(negotiationThreads.id, threadId));
      expect(threadInDb.status).toBe('OPEN');

      // 4. Buyer can submit a revised counter-offer
      const counterReq = new Request(`http://localhost/api/v1/negotiations/${threadId}/offer`, {
        method: 'POST',
        headers: authHeaders(buyerAToken),
        body: JSON.stringify({
          offerAmountBdt: 13000,
          offeredQuantity: 100,
          notes: 'Revised offer after rejection',
        }),
      });
      const counterRes = await submitOfferRoute(counterReq, routeParams(threadId));
      expect(counterRes.status).toBe(201);

      // Verify new offer is PENDING
      const [newOffer] = await db
        .select()
        .from(negotiationOffers)
        .where(eq(negotiationOffers.id, (await counterRes.json()).offer.id));
      expect(newOffer.status).toBe('PENDING');
      expect(Number(newOffer.offer_amount_bdt)).toBe(13000);
    });
  });

  describe('Part 6: List Threads for User', () => {
    it('lists all threads for buyer and seller', async () => {
      // Buyer A creates thread on listing
      const threadReq = new Request('http://localhost/api/v1/negotiations/threads', {
        method: 'POST',
        headers: authHeaders(buyerAToken),
        body: JSON.stringify({
          listingId,
          initialOfferAmountBdt: 12000,
          offeredQuantity: 100,
        }),
      });
      await createThreadRoute(threadReq);

      // Buyer A queries their threads
      const buyerListReq = new Request('http://localhost/api/v1/negotiations', {
        headers: authHeaders(buyerAToken),
      });
      const buyerListRes = await listThreadsRoute(buyerListReq);
      expect(buyerListRes.status).toBe(200);
      const buyerData = await buyerListRes.json();
      expect(buyerData.threads).toHaveLength(1);
      expect(buyerData.threads[0].listing_id).toBe(listingId);

      // Seller queries their threads
      const sellerListReq = new Request('http://localhost/api/v1/negotiations', {
        headers: authHeaders(sellerToken),
      });
      const sellerListRes = await listThreadsRoute(sellerListReq);
      expect(sellerListRes.status).toBe(200);
      const sellerData = await sellerListRes.json();
      expect(sellerData.threads).toHaveLength(1);
      expect(sellerData.threads[0].listing_id).toBe(listingId);
    });
  });
});
