// SPEC 13: Auction Escrow Hold & Unified Dispute Arbitration (Ticket 09b)
import crypto from 'crypto';
import {
  db,
  escrowHolds,
  disputes,
  auctionLots,
  auctionBids,
  pickupOrders,
  creditTxns,
  trustDecisions,
  eq,
} from '@chokro/db';
import { EscrowDomain } from '../lib/domain/EscrowDomain';
import { DisputeDomain } from '../lib/domain/DisputeDomain';
import { AuctionDomain } from '../lib/domain/AuctionDomain';
import { TrustGateDomain } from '../lib/domain/TrustGateDomain';
import { HandoverDomain } from '../lib/domain/HandoverDomain';
import { escrowRepo } from '../lib/repos/escrow';
import { disputeRepo } from '../lib/repos/disputes';
import { auctionRepo } from '../lib/repos/auctions';
import { partnerRepo } from '../lib/repos/partners';
import { walletRepo } from '../lib/repos/wallet';
import { GET as listLiveLotsRoute } from '../app/api/v1/auction-lots/live/route';
import { POST as createLotRoute } from '../app/api/v1/auction-lots/route';
import { POST as placeBidRoute } from '../app/api/v1/auction-lots/[id]/bids/route';
import { GET as getLotRoute } from '../app/api/v1/auction-lots/[id]/route';
import { POST as releaseEscrowRoute } from '../app/api/v1/escrow/[id]/release/route';
import { POST as createDisputeRoute, GET as listDisputesRoute } from '../app/api/v1/disputes/route';
import { GET as adminListDisputesRoute } from '../app/api/v1/admin/disputes/route';
import { POST as adminResolveDisputeRoute } from '../app/api/v1/admin/disputes/[id]/resolve/route';
import {
  authHeaders,
  createTestUser,
  resetTestStore,
  routeParams,
  tokenFor,
} from './test-utils';

const LOT_FIXTURE = {
  title: 'Baled HDPE Flakes - Industrial Grade',
  description: 'Clean sorted HDPE flakes from campus collection drive, 500kg baled.',
  category: 'PLASTICS',
  quantityKg: 500,
  startingPrice: 30000,
  reservePrice: 45000,
  originLabel: 'Chittagong University Bin #3',
  durationMinutes: 60,
};

async function createPartner(orgName: string, role: 'PARTNER' = 'PARTNER') {
  const user = await createTestUser(role, `${crypto.randomUUID()}@${orgName.toLowerCase().replace(/\s+/g, '')}.test.chokro.org`);
  const partner = await partnerRepo.apply({
    user_id: user.id,
    org_name: orgName,
    types: ['RECYCLER'],
    status: 'VERIFIED',
  });
  return { user, partner, token: tokenFor(user) };
}

describe('SPEC 13: Auction Escrow Hold & Unified Dispute Arbitration (Ticket 09b)', () => {
  let sellerPartner: Awaited<ReturnType<typeof createPartner>>;
  let buyerPartner: Awaited<ReturnType<typeof createPartner>>;
  let adminUser: Awaited<ReturnType<typeof createTestUser>>;
  let adminToken: string;

  beforeEach(async () => {
    await resetTestStore();
    sellerPartner = await createPartner('Green Bengal Aggregators');
    buyerPartner = await createPartner('Dhaka Polymer Industries');
    adminUser = await createTestUser('ADMIN', 'arbitrator@admin.chokro.org');
    adminToken = tokenFor(adminUser);
  });

  // =========================================================================
  // 1. LIVE AUCTION LOTS ENDPOINT (M09)
  // =========================================================================
  describe('1. Live Auction Lots Route (M09)', () => {
    it('returns only live lots via GET /api/v1/auction-lots/live', async () => {
      // Create live lot
      const createRes = await createLotRoute(
        new Request('http://localhost/api/v1/auction-lots', {
          method: 'POST',
          headers: authHeaders(sellerPartner.token),
          body: JSON.stringify(LOT_FIXTURE),
        })
      );
      expect(createRes.status).toBe(201);
      const { lot } = await createRes.json();

      const liveRes = await listLiveLotsRoute(
        new Request('http://localhost/api/v1/auction-lots/live')
      );
      expect(liveRes.status).toBe(200);
      const liveData = await liveRes.json();
      expect(liveData.lots).toBeDefined();
      expect(liveData.lots.length).toBe(1);
      expect(liveData.lots[0].id).toBe(lot.id);
      expect(liveData.lots[0].status).toBe('LIVE');
    });
  });

  // =========================================================================
  // 2. AUCTION ESCROW HOLD UPON LOT CLOSURE
  // =========================================================================
  describe('2. B2B Auction Escrow Hold Creation upon Lot Closure', () => {
    it('commits buyer funds into escrow_holds when lot closes with reserve met', async () => {
      // 1. Create lot
      const createRes = await createLotRoute(
        new Request('http://localhost/api/v1/auction-lots', {
          method: 'POST',
          headers: authHeaders(sellerPartner.token),
          body: JSON.stringify(LOT_FIXTURE),
        })
      );
      const { lot } = await createRes.json();

      // 2. Place winning bid above reserve
      const bidRes = await placeBidRoute(
        new Request(`http://localhost/api/v1/auction-lots/${lot.id}/bids`, {
          method: 'POST',
          headers: authHeaders(buyerPartner.token),
          body: JSON.stringify({ amount: 50000 }), // Reserve is 45000
        }),
        routeParams(lot.id)
      );
      expect(bidRes.status).toBe(201);

      // 3. Fast-forward past close time
      await auctionRepo.updateLot(lot.id, { closes_at: new Date(Date.now() - 60_000) });

      // 4. Read lot detail to trigger lazy close
      const detailRes = await getLotRoute(
        new Request(`http://localhost/api/v1/auction-lots/${lot.id}`),
        routeParams(lot.id)
      );
      const detailData = await detailRes.json();
      expect(detailData.lot.status).toBe('ENDED');
      expect(detailData.outcome.sold).toBe(true);

      // 5. Assert escrow_holds record created in DB
      const hold = await escrowRepo.findByLotId(lot.id);
      expect(hold).toBeDefined();
      expect(hold?.lot_id).toBe(lot.id);
      expect(hold?.buyer_id).toBe(buyerPartner.user.id);
      expect(hold?.seller_id).toBe(sellerPartner.user.id);
      expect(Number(hold?.amount_bdt)).toBe(50000);
      expect(hold?.status).toBe('HELD');

      const expiresMs = new Date(hold!.inspection_expires_at).getTime();
      expect(expiresMs).toBeGreaterThan(Date.now());
      // 48 hours inspection window
      expect(expiresMs - Date.now()).toBeGreaterThan(47 * 3600_000);
      expect(expiresMs - Date.now()).toBeLessThanOrEqual(48 * 3600_000 + 10000);
    });

    it('does not create escrow hold when lot closes below reserve (no sale)', async () => {
      const createRes = await createLotRoute(
        new Request('http://localhost/api/v1/auction-lots', {
          method: 'POST',
          headers: authHeaders(sellerPartner.token),
          body: JSON.stringify(LOT_FIXTURE),
        })
      );
      const { lot } = await createRes.json();

      // Bid below reserve
      await placeBidRoute(
        new Request(`http://localhost/api/v1/auction-lots/${lot.id}/bids`, {
          method: 'POST',
          headers: authHeaders(buyerPartner.token),
          body: JSON.stringify({ amount: 35000 }), // Reserve is 45000
        }),
        routeParams(lot.id)
      );

      await auctionRepo.updateLot(lot.id, { closes_at: new Date(Date.now() - 60_000) });
      await getLotRoute(
        new Request(`http://localhost/api/v1/auction-lots/${lot.id}`),
        routeParams(lot.id)
      );

      const hold = await escrowRepo.findByLotId(lot.id);
      expect(hold).toBeNull();
    });
  });

  // =========================================================================
  // 3. BUYER ACCEPTANCE & ESCROW RELEASE
  // =========================================================================
  describe('3. Buyer Acceptance & Escrow Release', () => {
    it('buyer accepts lot and releases escrow funds to seller via POST /api/v1/escrow/[id]/release', async () => {
      const lot = await auctionRepo.createLot({
        title: 'Industrial Copper Scrap',
        category: 'METAL',
        quantity_kg: '200.00',
        starting_price_bdt: '40000.00',
        reserve_price_bdt: '50000.00',
        status: 'ENDED',
        opens_at: new Date(Date.now() - 7200_000),
        closes_at: new Date(Date.now() - 3600_000),
        created_by: sellerPartner.user.id,
      });

      const bid = await auctionRepo.insertBid({
        lot_id: lot.id,
        bidder_user_id: buyerPartner.user.id,
        amount_bdt: '55000.00',
        bid_number: 1,
      });

      await auctionRepo.updateLot(lot.id, { winning_bid_id: bid.id });

      const hold = await EscrowDomain.createHoldForWinningLot(lot, bid);
      expect(hold.status).toBe('HELD');

      // Buyer releases escrow
      const releaseReq = new Request(`http://localhost/api/v1/escrow/${hold.id}/release`, {
        method: 'POST',
        headers: authHeaders(buyerPartner.token),
        body: JSON.stringify({ notes: 'Inspected material — high purity as described' }),
      });

      const releaseRes = await releaseEscrowRoute(releaseReq, routeParams(hold.id));
      expect(releaseRes.status).toBe(200);
      const releaseData = await releaseRes.json();
      expect(releaseData.escrowHold.status).toBe('RELEASED_TO_SELLER');

      // Verify DB
      const updatedHold = await escrowRepo.findById(hold.id);
      expect(updatedHold?.status).toBe('RELEASED_TO_SELLER');
    });

    it('inspection window expiration auto-releases funds to seller when no dispute is active', async () => {
      const lot = await auctionRepo.createLot({
        title: 'Auto-Release Lot',
        category: 'PLASTICS',
        quantity_kg: '100.00',
        starting_price_bdt: '10000.00',
        reserve_price_bdt: '10000.00',
        status: 'ENDED',
        opens_at: new Date(Date.now() - 200_000_000),
        closes_at: new Date(Date.now() - 190_000_000),
        created_by: sellerPartner.user.id,
      });

      const bid = await auctionRepo.insertBid({
        lot_id: lot.id,
        bidder_user_id: buyerPartner.user.id,
        amount_bdt: '12000.00',
        bid_number: 1,
      });

      // Create hold with expired inspection window (e.g. 50 hours ago)
      const hold = await escrowRepo.create({
        lot_id: lot.id,
        buyer_id: buyerPartner.user.id,
        seller_id: sellerPartner.user.id,
        amount_bdt: '12000.00',
        status: 'HELD',
        inspection_expires_at: new Date(Date.now() - 3600_000), // Expired 1 hour ago
      });

      // Explicit sweep settles the expired window
      const { released } = await EscrowDomain.sweepExpiredHolds();
      expect(released.some((h) => h.id === hold.id)).toBe(true);

      const checkHold = await escrowRepo.findById(hold.id);
      expect(checkHold?.status).toBe('RELEASED_TO_SELLER');
    });

    it('sweep freezes expired holds with an open dispute and reports both outcomes', async () => {
      const lot = await auctionRepo.createLot({
        title: 'Disputed Expiry Lot',
        category: 'METAL',
        quantity_kg: '80.00',
        starting_price_bdt: '9000.00',
        reserve_price_bdt: '9000.00',
        status: 'ENDED',
        opens_at: new Date(Date.now() - 7200_000),
        closes_at: new Date(Date.now() - 3600_000),
        created_by: sellerPartner.user.id,
      });

      const bid = await auctionRepo.insertBid({
        lot_id: lot.id,
        bidder_user_id: buyerPartner.user.id,
        amount_bdt: '11000.00',
        bid_number: 1,
      });

      const hold = await escrowRepo.create({
        lot_id: lot.id,
        buyer_id: buyerPartner.user.id,
        seller_id: sellerPartner.user.id,
        amount_bdt: '11000.00',
        status: 'HELD',
        inspection_expires_at: new Date(Date.now() - 3600_000),
      });

      // Seed the open dispute directly (bypassing DisputeDomain.createDispute,
      // which would freeze the hold immediately and take it out of the HELD
      // state that sweepExpiredHolds targets).
      await disputeRepo.create({
        source_type: 'AUCTION_LOT',
        source_id: lot.id,
        opened_by: buyerPartner.user.id,
        against_user_id: sellerPartner.user.id,
        reason: 'Material arrived contaminated with mixed waste.',
        evidence_urls: [],
        status: 'OPEN',
      });

      const { released, frozen } = await EscrowDomain.sweepExpiredHolds();
      expect(released.some((h) => h.id === hold.id)).toBe(false);
      expect(frozen.some((h) => h.id === hold.id)).toBe(true);

      const checkHold = await escrowRepo.findById(hold.id);
      expect(checkHold?.status).toBe('FROZEN_IN_DISPUTE');
    });

    it('pure reads never mutate state even when a hold is expired', async () => {
      const lot = await auctionRepo.createLot({
        title: 'Read-Only Lot',
        category: 'PAPER',
        quantity_kg: '40.00',
        starting_price_bdt: '5000.00',
        reserve_price_bdt: '5000.00',
        status: 'ENDED',
        opens_at: new Date(Date.now() - 7200_000),
        closes_at: new Date(Date.now() - 3600_000),
        created_by: sellerPartner.user.id,
      });

      const bid = await auctionRepo.insertBid({
        lot_id: lot.id,
        bidder_user_id: buyerPartner.user.id,
        amount_bdt: '7000.00',
        bid_number: 1,
      });

      const hold = await escrowRepo.create({
        lot_id: lot.id,
        buyer_id: buyerPartner.user.id,
        seller_id: sellerPartner.user.id,
        amount_bdt: '7000.00',
        status: 'HELD',
        inspection_expires_at: new Date(Date.now() - 3600_000), // Expired
      });

      await EscrowDomain.getHoldById(hold.id);
      await EscrowDomain.getHoldByLotId(lot.id);

      const afterReads = await escrowRepo.findById(hold.id);
      expect(afterReads?.status).toBe('HELD');
    });
  });

  // =========================================================================
  // 4. UNIFIED DISPUTE ARBITRATION QUEUE
  // =========================================================================
  describe('4. Unified Dispute Arbitration Queue (Pickups, Deposits, Auction Lots)', () => {
    it('opens dispute on auction lot and freezes the escrow hold', async () => {
      const lot = await auctionRepo.createLot({
        title: 'Contaminated Mixed Metal Lot',
        category: 'METAL',
        quantity_kg: '300.00',
        starting_price_bdt: '25000.00',
        reserve_price_bdt: '25000.00',
        status: 'ENDED',
        opens_at: new Date(Date.now() - 7200_000),
        closes_at: new Date(Date.now() - 3600_000),
        created_by: sellerPartner.user.id,
      });

      const bid = await auctionRepo.insertBid({
        lot_id: lot.id,
        bidder_user_id: buyerPartner.user.id,
        amount_bdt: '30000.00',
        bid_number: 1,
      });

      const hold = await EscrowDomain.createHoldForWinningLot(lot, bid);
      expect(hold.status).toBe('HELD');

      // Buyer opens dispute with photographic evidence
      const disputeReq = new Request('http://localhost/api/v1/disputes', {
        method: 'POST',
        headers: authHeaders(buyerPartner.token),
        body: JSON.stringify({
          sourceType: 'AUCTION_LOT',
          sourceId: lot.id,
          againstUserId: sellerPartner.user.id,
          reason: 'Lot contains over 40% slag and mixed dirt instead of pure clean copper.',
          evidenceUrls: ['https://storage.chokro.org/disputes/lot-photo-1.jpg'],
        }),
      });

      const disputeRes = await createDisputeRoute(disputeReq);
      expect(disputeRes.status).toBe(201);
      const disputeData = await disputeRes.json();
      expect(disputeData.dispute.status).toBe('OPEN');
      expect(disputeData.dispute.source_type).toBe('AUCTION_LOT');

      // Assert escrow hold is FROZEN_IN_DISPUTE
      const updatedHold = await escrowRepo.findById(hold.id);
      expect(updatedHold?.status).toBe('FROZEN_IN_DISPUTE');

      // Buyer cannot release while frozen in dispute
      const unauthReleaseReq = new Request(`http://localhost/api/v1/escrow/${hold.id}/release`, {
        method: 'POST',
        headers: authHeaders(buyerPartner.token),
      });
      const unauthReleaseRes = await releaseEscrowRoute(unauthReleaseReq, routeParams(hold.id));
      expect(unauthReleaseRes.status).toBe(403);
    });

    it('prevents opening duplicate disputes on the same active subject', async () => {
      const lotId = crypto.randomUUID();

      // First dispute
      await createDisputeRoute(
        new Request('http://localhost/api/v1/disputes', {
          method: 'POST',
          headers: authHeaders(buyerPartner.token),
          body: JSON.stringify({
            sourceType: 'AUCTION_LOT',
            sourceId: lotId,
            againstUserId: sellerPartner.user.id,
            reason: 'First dispute filing for defective goods.',
          }),
        })
      );

      // Duplicate dispute attempt
      const dupRes = await createDisputeRoute(
        new Request('http://localhost/api/v1/disputes', {
          method: 'POST',
          headers: authHeaders(buyerPartner.token),
          body: JSON.stringify({
            sourceType: 'AUCTION_LOT',
            sourceId: lotId,
            againstUserId: sellerPartner.user.id,
            reason: 'Second dispute filing attempt for the same lot.',
          }),
        })
      );
      expect(dupRes.status).toBe(409);
    });
  });

  // =========================================================================
  // 5. CROSS-CUTTING PAUSE ON CREDIT VERIFICATION
  // =========================================================================
  describe('5. Cross-Cutting Dispute Pause on Credit Verification', () => {
    it('an open dispute on a pickup pauses that pickup credit verification', async () => {
      const customer = await createTestUser('INDIVIDUAL', 'disputing.customer@campus.ac.bd');
      const pickupId = crypto.randomUUID();
      const custodyRef = `CUSTODY-PICKUP-${pickupId}`;

      // Create pending credit txn
      const credit = await walletRepo.createEarnTransaction({
        userId: customer.id,
        amount: 800,
        custodyRef,
        status: 'PENDING',
        reason: 'Pickup collection pending verification',
      });

      // Open a dispute against the pickup
      await DisputeDomain.createDispute({
        sourceType: 'PICKUP',
        sourceId: pickupId,
        openedBy: customer.id,
        againstUserId: sellerPartner.user.id,
        reason: 'Collector weighed material incorrectly and recorded wrong mass.',
      });

      // Trust Gate evaluation on this pickup must escalate rather than auto-clear
      const evaluationResult = await TrustGateDomain.evaluateAndApply({
        subjectType: 'PICKUP',
        subjectId: pickupId,
        userId: customer.id,
        category: 'PLASTICS',
        declaredQuantity: 20,
        verifiedQuantity: 20,
        unit: 'kg',
        isSessionValid: true,
        creditTxnId: credit.id,
        custodyRef,
      });

      expect(evaluationResult.decision).toBe('ESCALATE');
      expect(evaluationResult.failingSignals).toContain('open_dispute_pause');
      expect(evaluationResult.creditStatus).toBe('PENDING');

      // Admin trying to VERIFY escalated decision is blocked while dispute is open
      await expect(
        HandoverDomain.adjudicateDecision(
          evaluationResult.trustDecisionId,
          { action: 'VERIFY' },
          adminUser.id
        )
      ).rejects.toThrow(/Cannot verify credits while an open dispute is active/);

      // Resolve the dispute
      const openDispute = await disputeRepo.findOpenBySource('PICKUP', pickupId);
      expect(openDispute).toBeDefined();

      await DisputeDomain.resolveDispute({
        disputeId: openDispute!.id,
        adminUserId: adminUser.id,
        resolution: 'BUYER_FAVORED',
        resolutionNotes: 'Dispute resolved after reviewing scale telemetry.',
      });

      // After dispute resolution, admin adjudication VERIFY succeeds
      const adjResult = await HandoverDomain.adjudicateDecision(
        evaluationResult.trustDecisionId,
        { action: 'VERIFY' },
        adminUser.id
      );
      expect(adjResult.success).toBe(true);
      expect(adjResult.action).toBe('VERIFIED');
    });
  });

  // =========================================================================
  // 6. ADMIN DISPUTE ARBITRATION & PARTIAL RELEASE SETTLEMENT
  // =========================================================================
  describe('6. Admin Dispute Arbitration & Partial-Release Settlement (A09)', () => {
    it('admin lists all disputes via GET /api/v1/admin/disputes with filters', async () => {
      // Create pickup dispute and auction dispute
      await disputeRepo.create({
        source_type: 'PICKUP',
        source_id: crypto.randomUUID(),
        opened_by: buyerPartner.user.id,
        against_user_id: sellerPartner.user.id,
        reason: 'Pickup schedule missed by collector.',
        status: 'OPEN',
      });

      await disputeRepo.create({
        source_type: 'AUCTION_LOT',
        source_id: crypto.randomUUID(),
        opened_by: buyerPartner.user.id,
        against_user_id: sellerPartner.user.id,
        reason: 'Lot grade was misrepresented.',
        status: 'RESOLVED',
      });

      const listReq = new Request('http://localhost/api/v1/admin/disputes', {
        headers: authHeaders(adminToken),
      });
      const listRes = await adminListDisputesRoute(listReq);
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      expect(listData.count).toBe(2);

      // Filter by status=OPEN
      const openFilterReq = new Request('http://localhost/api/v1/admin/disputes?status=OPEN', {
        headers: authHeaders(adminToken),
      });
      const openFilterRes = await adminListDisputesRoute(openFilterReq);
      const openData = await openFilterRes.json();
      expect(openData.count).toBe(1);
      expect(openData.disputes[0].source_type).toBe('PICKUP');
    });

    it('admin executes PARTIAL_RELEASE settlement with exact arithmetic', async () => {
      const lot = await auctionRepo.createLot({
        title: 'Baled Cardboard Offcuts',
        category: 'PAPER',
        quantity_kg: '1000.00',
        starting_price_bdt: '40000.00',
        reserve_price_bdt: '50000.00',
        status: 'ENDED',
        opens_at: new Date(Date.now() - 7200_000),
        closes_at: new Date(Date.now() - 3600_000),
        created_by: sellerPartner.user.id,
      });

      const bid = await auctionRepo.insertBid({
        lot_id: lot.id,
        bidder_user_id: buyerPartner.user.id,
        amount_bdt: '52400.00',
        bid_number: 1,
      });

      const hold = await EscrowDomain.createHoldForWinningLot(lot, bid);
      expect(hold.amount_bdt).toBe('52400.00');

      // Open dispute
      const dispute = await DisputeDomain.createDispute({
        sourceType: 'AUCTION_LOT',
        sourceId: lot.id,
        openedBy: buyerPartner.user.id,
        againstUserId: sellerPartner.user.id,
        reason: 'Material has 20% moisture content from rain during transport.',
      });

      // Admin resolves with partial release: ৳32,400 to seller, ৳20,000 refunded to buyer (total = 52,400)
      const resolveReq = new Request(
        `http://localhost/api/v1/admin/disputes/${dispute.id}/resolve`,
        {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            resolution: 'PARTIAL_RELEASE',
            resolutionNotes: 'Verified moisture degradation. ৳20,000 refunded to buyer, ৳32,400 released to seller.',
            buyerAmountBdt: 20000,
            sellerAmountBdt: 32400,
          }),
        }
      );

      const resolveRes = await adminResolveDisputeRoute(resolveReq, routeParams(dispute.id));
      expect(resolveRes.status).toBe(200);
      const resolveData = await resolveRes.json();
      expect(resolveData.dispute.status).toBe('RESOLVED');
      expect(resolveData.dispute.resolution).toBe('PARTIAL_RELEASE');

      // Assert escrow hold status updated to PARTIALLY_RELEASED
      const updatedHold = await escrowRepo.findById(hold.id);
      expect(updatedHold?.status).toBe('PARTIALLY_RELEASED');
    });

    it('rejects partial release when split amounts do not sum to total held funds', async () => {
      const lot = await auctionRepo.createLot({
        title: 'Electronic Boards Scrap',
        category: 'E_WASTE',
        quantity_kg: '50.00',
        starting_price_bdt: '20000.00',
        reserve_price_bdt: '20000.00',
        status: 'ENDED',
        opens_at: new Date(Date.now() - 7200_000),
        closes_at: new Date(Date.now() - 3600_000),
        created_by: sellerPartner.user.id,
      });

      const bid = await auctionRepo.insertBid({
        lot_id: lot.id,
        bidder_user_id: buyerPartner.user.id,
        amount_bdt: '25000.00',
        bid_number: 1,
      });

      await EscrowDomain.createHoldForWinningLot(lot, bid);

      const dispute = await DisputeDomain.createDispute({
        sourceType: 'AUCTION_LOT',
        sourceId: lot.id,
        openedBy: buyerPartner.user.id,
        againstUserId: sellerPartner.user.id,
        reason: 'Defective circuit boards.',
      });

      // Sum is 10000 + 10000 = 20000 != 25000
      const badSplitReq = new Request(
        `http://localhost/api/v1/admin/disputes/${dispute.id}/resolve`,
        {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            resolution: 'PARTIAL_RELEASE',
            resolutionNotes: 'Incorrect split calculation.',
            buyerAmountBdt: 10000,
            sellerAmountBdt: 10000,
          }),
        }
      );

      const badSplitRes = await adminResolveDisputeRoute(badSplitReq, routeParams(dispute.id));
      expect(badSplitRes.status).toBe(400);
    });

    it('enforces resolution immutability (cannot re-resolve already resolved dispute)', async () => {
      const dispute = await disputeRepo.create({
        source_type: 'DEPOSIT',
        source_id: crypto.randomUUID(),
        opened_by: buyerPartner.user.id,
        against_user_id: sellerPartner.user.id,
        reason: 'Deposit scale calibration contest.',
        status: 'OPEN',
      });

      // Resolve once
      await adminResolveDisputeRoute(
        new Request(`http://localhost/api/v1/admin/disputes/${dispute.id}/resolve`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            resolution: 'UPHELD',
            resolutionNotes: 'Initial valid adjudication.',
          }),
        }),
        routeParams(dispute.id)
      );

      // Attempt to resolve second time
      const secondResolveRes = await adminResolveDisputeRoute(
        new Request(`http://localhost/api/v1/admin/disputes/${dispute.id}/resolve`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            resolution: 'DISMISSED',
            resolutionNotes: 'Attempting to rewrite resolution.',
          }),
        }),
        routeParams(dispute.id)
      );

      expect(secondResolveRes.status).toBe(400);
    });

    it('rejects non-admin users from accessing admin dispute endpoints with 403', async () => {
      const unauthList = await adminListDisputesRoute(
        new Request('http://localhost/api/v1/admin/disputes', {
          headers: authHeaders(buyerPartner.token),
        })
      );
      expect(unauthList.status).toBe(403);

      const unauthResolve = await adminResolveDisputeRoute(
        new Request(`http://localhost/api/v1/admin/disputes/${crypto.randomUUID()}/resolve`, {
          method: 'POST',
          headers: authHeaders(buyerPartner.token),
          body: JSON.stringify({
            resolution: 'DISMISSED',
            resolutionNotes: 'Unauthorized attempt.',
          }),
        }),
        routeParams(crypto.randomUUID())
      );
      expect(unauthResolve.status).toBe(403);
    });
  });
});
