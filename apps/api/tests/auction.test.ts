import crypto from 'crypto';
import { GET as listLotsRoute, POST as createLotRoute } from '../app/api/auction-lots/route';
import { GET as getLotRoute } from '../app/api/auction-lots/[id]/route';
import { POST as placeBidRoute } from '../app/api/auction-lots/[id]/bids/route';
import { authHeaders, createTestUser, resetTestStore, routeParams, tokenFor } from './test-utils';
import { auctionRepo } from '../lib/repos/auctions';
import { partnerRepo } from '../lib/repos/partners';

const ANTI_SNIPE_MS = 2 * 60 * 1000;

const LOT_BODY = {
  title: 'Bulk ferrous scrap from garment factory',
  description: 'Clean compressed MSAL offcuts, sorted and baled.',
  category: 'METAL',
  quantityKg: 800,
  startingPrice: 40000,
  reservePrice: 52345, // deliberately unique so the sealed value is detectable if leaked
  originLabel: 'Narayanganj EPZ',
  durationMinutes: 60,
};

async function createPartner(orgName: string) {
  const user = await createTestUser('PARTNER', `${crypto.randomUUID()}@${orgName.toLowerCase()}.test.chokro.org`);
  const partner = await partnerRepo.apply({
    user_id: user.id,
    org_name: orgName,
    types: ['RECYCLER'],
    status: 'VERIFIED',
  });
  return { user, partner, token: tokenFor(user) };
}

async function createLot(token: string, body: Record<string, unknown> = LOT_BODY) {
  return createLotRoute(new Request('http://localhost/api/auction-lots', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  }));
}

async function placeBid(token: string, lotId: string, amount: number) {
  return placeBidRoute(new Request(`http://localhost/api/auction-lots/${lotId}/bids`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ amount }),
  }), routeParams(lotId));
}

async function getLotDetail(lotId: string) {
  return getLotRoute(new Request(`http://localhost/api/auction-lots/${lotId}`), routeParams(lotId));
}

function listLots(statusQuery?: string) {
  const url = statusQuery
    ? `http://localhost/api/auction-lots?status=${statusQuery}`
    : 'http://localhost/api/auction-lots';
  return listLotsRoute(new Request(url));
}

describe('auction API', () => {
  let seller: { token: string };
  let recyclerA: { token: string; partner: { org_name: string } };
  let recyclerB: { token: string; partner: { org_name: string } };

  beforeEach(async () => {
    await resetTestStore();
    const sellerPartner = await createPartner('BanglaBin Recycling Ltd');
    const a = await createPartner('Dhaka Steel Recyclers');
    const b = await createPartner('Narayanganj Metal Works');
    seller = { token: sellerPartner.token };
    recyclerA = a;
    recyclerB = b;
  });

  it('creates a lot as PARTNER and accepts the first bid with bid_number 1', async () => {
    const created = await createLot(seller.token);
    const createdData = await created.json();
    expect(created.status).toBe(201);
    expect(createdData.lot.status).toBe('LIVE');
    expect(createdData.lot.current_price_bdt).toBe(LOT_BODY.startingPrice);
    expect(createdData.lot.reserve_met).toBe(false);
    expect(createdData.lot.bid_count).toBe(0);

    const bid = await placeBid(recyclerA.token, createdData.lot.id, LOT_BODY.startingPrice + 50);
    const bidData = await bid.json();
    expect(bid.status).toBe(201);
    expect(bidData.bid.bid_number).toBe(1);
    expect(bidData.bid.bidder_org_name).toBe(recyclerA.partner.org_name);
    expect(bidData.lot.current_price_bdt).toBe(LOT_BODY.startingPrice + 50);
    expect(bidData.lot.bid_count).toBe(1);

    // Detail view agrees and exposes the org-named bid feed.
    const detail = await getLotDetail(createdData.lot.id);
    const detailData = await detail.json();
    expect(detail.status).toBe(200);
    expect(detailData.lot.bid_count).toBe(1);
    expect(detailData.bids[0].bid_number).toBe(1);
    expect(detailData.bids[0].bidder_org_name).toBe(recyclerA.partner.org_name);
    expect(detailData.lot.seller_org_name).toBe('BanglaBin Recycling Ltd');
  });

  it('rejects lot creation and bidding from INDIVIDUAL users with 403', async () => {
    const individual = await createTestUser('INDIVIDUAL');
    const individualToken = tokenFor(individual);

    const forbiddenCreate = await createLot(individualToken);
    expect(forbiddenCreate.status).toBe(403);

    const created = await createLot(seller.token);
    const { lot } = await created.json();
    const forbiddenBid = await placeBid(individualToken, lot.id, lot.current_price_bdt + 50);
    expect(forbiddenBid.status).toBe(403);
    expect((await auctionRepo.countBids(lot.id))).toBe(0);
  });

  it('enforces server-authoritative ordering: bids at or below the current highest get 409', async () => {
    const created = await createLot(seller.token);
    const { lot } = await created.json();

    const first = await placeBid(recyclerA.token, lot.id, 40100);
    expect(first.status).toBe(201);

    // Equal to, below, and just-under-minimum bids are all rejected.
    for (const amount of [40100, 40000, 40149]) {
      const rejected = await placeBid(recyclerB.token, lot.id, amount);
      expect(rejected.status).toBe(409);
      const body = await rejected.json();
      expect(body.details.current_price_bdt).toBe(40100);
      expect(body.details.min_increment_bdt).toBe(50);
      expect(body.details.min_next_bid_bdt).toBe(40150);
    }

    // The first server-accepted counter bid takes bid_number 2.
    const second = await placeBid(recyclerB.token, lot.id, 40150);
    const secondData = await second.json();
    expect(second.status).toBe(201);
    expect(secondData.bid.bid_number).toBe(2);
    expect(secondData.lot.current_price_bdt).toBe(40150);
  });

  it('extends closes_at by the anti-snipe window when a valid bid lands in the final 2 minutes', async () => {
    const created = await createLot(seller.token);
    const { lot } = await created.json();

    // Early bid: outside the final window, the close time is untouched.
    const early = await placeBid(recyclerA.token, lot.id, 40100);
    const earlyData = await early.json();
    expect(earlyData.lot.closes_at).toBe(lot.closes_at);

    // Setup: shove the close to ~1 minute out, directly via the repo.
    const imminentClose = new Date(Date.now() + 60_000);
    await auctionRepo.updateLot(lot.id, { closes_at: imminentClose });

    const snipeBid = await placeBid(recyclerB.token, lot.id, 40150);
    const snipeData = await snipeBid.json();
    expect(snipeBid.status).toBe(201);
    const extendedClose = new Date(snipeData.lot.closes_at).getTime();
    expect(extendedClose).toBeGreaterThanOrEqual(Date.now() + ANTI_SNIPE_MS - 2_000);
    expect(extendedClose).toBeGreaterThan(imminentClose.getTime());
  });

  it('never serializes the sealed reserve — only the reserve_met boolean', async () => {
    const created = await createLot(seller.token);
    const createRaw = await created.clone().text();
    const { lot } = await created.json();

    const bid = await placeBid(recyclerA.token, lot.id, 52400); // above the sealed 52,345
    const bidRaw = await bid.clone().text();

    const list = await listLots();
    const listRaw = await list.clone().text();
    const detail = await getLotDetail(lot.id);
    const detailRaw = await detail.clone().text();

    for (const [label, raw] of [['create', createRaw], ['bid', bidRaw], ['list', listRaw], ['detail', detailRaw]] as const) {
      expect(raw).not.toContain('reserve_price_bdt');
      expect(raw).not.toContain('52345');
    }
    expect(createRaw).toContain('reserve_met');
    expect(bidRaw).toContain('"reserve_met":true');
    expect(listRaw).toContain('reserve_met');
    expect(detailRaw).toContain('reserve_met');
    expect((await bid.json()).lot.reserve_met).toBe(true);
  });

  it('lazily closes expired lots on read and rejects later bids with 410', async () => {
    const created = await createLot(seller.token);
    const { lot } = await created.json();
    await placeBid(recyclerA.token, lot.id, 52400); // above the sealed reserve

    // Fast-forward past the close; the next read must end the auction.
    await auctionRepo.updateLot(lot.id, { closes_at: new Date(Date.now() - 60_000) });

    const detail = await getLotDetail(lot.id);
    const detailData = await detail.json();
    expect(detailData.lot.status).toBe('ENDED');
    expect(detailData.lot.winning_bid_id).toBe(detailData.bids[0].id);
    expect(detailData.outcome.sold).toBe(true);
    expect(detailData.outcome.winner_org_name).toBe(recyclerA.partner.org_name);
    expect(detailData.outcome.final_price_bdt).toBe(52400);

    const lateBid = await placeBid(recyclerB.token, lot.id, 60000);
    expect(lateBid.status).toBe(410);

    // The closed lot shows up on the default board via the same lazy-close path.
    const list = await listLots();
    const listData = await list.json();
    const ended = listData.lots.find((l: { id: string }) => l.id === lot.id);
    expect(ended.status).toBe('ENDED');
  });

  it('ends below-reserve lots as no sale (sealed reserve decides the outcome)', async () => {
    const created = await createLot(seller.token, { ...LOT_BODY, startingPrice: 30000, reservePrice: 52345 });
    const { lot } = await created.json();
    await placeBid(recyclerA.token, lot.id, 30500); // below the sealed reserve

    await auctionRepo.updateLot(lot.id, { closes_at: new Date(Date.now() - 60_000) });
    const detail = await getLotDetail(lot.id);
    const detailData = await detail.json();

    expect(detailData.lot.status).toBe('ENDED');
    expect(detailData.lot.winning_bid_id).toBeNull();
    expect(detailData.outcome.sold).toBe(false);
    expect(detailData.outcome.reason).toBe('No sale — reserve not met');
    expect(detailData.lot.reserve_met).toBe(false);
  });

  it('validates the status filter and create-lot payload shape', async () => {
    const badStatus = await listLots('BOGUS');
    expect(badStatus.status).toBe(400);

    const badReserve = await createLot(seller.token, { ...LOT_BODY, reservePrice: LOT_BODY.startingPrice - 1 });
    expect(badReserve.status).toBe(400);

    const badDuration = await createLot(seller.token, { ...LOT_BODY, durationMinutes: 2 });
    expect(badDuration.status).toBe(400);

    const badBid = await createLot(seller.token).then(async (res) => {
      const { lot } = await res.json();
      return placeBid(recyclerA.token, lot.id, 0);
    });
    expect(badBid.status).toBe(400);
  });
});
