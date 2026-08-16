import { apiData, apiError, safeRoute } from '@/lib/http';
import { AuctionDomain } from '@/lib/domain/AuctionDomain';
import { auctionRepo } from '@/lib/repos/auctions';
import { partnerRepo } from '@/lib/repos/partners';

export const GET = safeRoute(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  const lot = await AuctionDomain.getLotById(id);
  if (!lot) {
    return apiError('Auction lot not found', 404);
  }

  const [bidRows, sellerPartner, highest] = await Promise.all([
    auctionRepo.findBidsByLot(id, 20),
    partnerRepo.findByUserId(lot.created_by),
    auctionRepo.findHighestBid(id),
  ]);
  const bidCount = await auctionRepo.countBids(id);
  const bids = bidRows.map((row) => AuctionDomain.toPublicBid(row.bid, row.bidder_org_name));

  let outcome: { sold: boolean; winner_org_name?: string; final_price_bdt?: number; reason?: string } | null = null;
  if (lot.status === 'ENDED') {
    if (lot.winning_bid_id && highest) {
      // The winner is by construction the highest accepted bid at close.
      const winnerOrg = bidRows.find((row) => row.bid.id === highest.id)?.bidder_org_name
        ?? (await partnerRepo.findByUserId(highest.bidder_user_id))?.org_name
        ?? null;
      outcome = {
        sold: true,
        winner_org_name: winnerOrg ?? `Bidder #${highest.bidder_user_id.slice(0, 8)}`,
        final_price_bdt: Number(highest.amount_bdt),
      };
    } else {
      outcome = { sold: false, reason: 'No sale — reserve not met' };
    }
  }

  return apiData({
    lot: {
      ...AuctionDomain.toPublicLot(lot, highest, bidCount),
      seller_org_name: sellerPartner?.org_name ?? 'Chokro partner',
    },
    bids,
    outcome,
  });
});

export { OPTIONS } from '@/lib/http';
