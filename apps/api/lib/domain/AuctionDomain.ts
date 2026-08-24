import { auctionRepo, type AuctionBid, type AuctionLot, type CreateLotInput as CreateAuctionLotInput } from '@/lib/repos/auctions';
import { partnerRepo } from '@/lib/repos/partners';
import { AuctionRealtimeService } from '@/lib/services/AuctionRealtimeService';
import { DomainRuleError } from '@/lib/database';
import { EscrowDomain } from './EscrowDomain';

const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['LIVE', 'CANCELLED'],
  LIVE: ['ENDED', 'CANCELLED'],
  ENDED: [],
  CANCELLED: [],
};

/** Minimum bid step above the current price (BDT). */
export const MIN_BID_INCREMENT_BDT = 50;
/** A valid bid landing inside this final window extends the close time. */
export const ANTI_SNIPE_WINDOW_MS = 2 * 60 * 1000;

export type PublicAuctionLot = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  quantity_kg: number;
  starting_price_bdt: number;
  origin_label: string | null;
  status: string;
  opens_at: string;
  closes_at: string;
  winning_bid_id: string | null;
  created_by: string;
  created_at: string;
  current_price_bdt: number;
  reserve_met: boolean;
  bid_count: number;
};

export type PublicAuctionBid = {
  id: string;
  lot_id: string;
  bid_number: number;
  amount_bdt: number;
  bidder_user_id: string;
  bidder_org_name: string;
  received_at: string;
};

export interface CreateLotParams {
  title: string;
  description?: string | null;
  category: string;
  quantityKg: number;
  startingPrice: number;
  reservePrice: number;
  originLabel?: string | null;
  durationMinutes: number;
  createdBy: string;
}

function bidderLabel(bidderUserId: string, orgName: string | null): string {
  return orgName ?? `Bidder #${bidderUserId.slice(0, 8)}`;
}

function formatBdt(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

/**
 * AuctionDomain — Deep Module for B2B Bulk Scrap Auction & Live Bidding Engine (M3 F4)
 *
 * Encapsulates:
 * 1. Sealed reserve price masking at the serialization seam (toPublicLot)
 * 2. Server-authoritative monotonic bid sequencing (bid_number)
 * 3. Dynamic anti-snipe 2-minute clock extensions
 * 4. Lazy-close evaluation on lot reads
 * 5. Decoupled Pusher broadcast event seam with polling fallback
 */
export const AuctionDomain = {
  canTransition(currentStatus: string, targetStatus: string): boolean {
    return TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
  },

  assertTransition(currentStatus: string, targetStatus: string): void {
    if (!this.canTransition(currentStatus, targetStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${targetStatus}`);
    }
  },

  isReserveMet(lot: AuctionLot, highestBid: AuctionBid | null): boolean {
    return highestBid != null && Number(highestBid.amount_bdt) >= Number(lot.reserve_price_bdt);
  },

  currentPriceBdt(lot: AuctionLot, highestBid: AuctionBid | null): number {
    return highestBid != null ? Number(highestBid.amount_bdt) : Number(lot.starting_price_bdt);
  },

  toPublicLot(lot: AuctionLot, highestBid: AuctionBid | null, bidCount: number): PublicAuctionLot {
    return {
      id: lot.id,
      title: lot.title,
      description: lot.description,
      category: lot.category,
      quantity_kg: Number(lot.quantity_kg),
      starting_price_bdt: Number(lot.starting_price_bdt),
      origin_label: lot.origin_label,
      status: lot.status,
      opens_at: lot.opens_at.toISOString(),
      closes_at: lot.closes_at.toISOString(),
      winning_bid_id: lot.winning_bid_id,
      created_by: lot.created_by,
      created_at: lot.created_at.toISOString(),
      current_price_bdt: this.currentPriceBdt(lot, highestBid),
      reserve_met: this.isReserveMet(lot, highestBid),
      bid_count: bidCount,
    };
  },

  toPublicBid(bid: AuctionBid, bidderOrgName: string | null): PublicAuctionBid {
    return {
      id: bid.id,
      lot_id: bid.lot_id,
      bid_number: bid.bid_number,
      amount_bdt: Number(bid.amount_bdt),
      bidder_user_id: bid.bidder_user_id,
      bidder_org_name: bidderLabel(bid.bidder_user_id, bidderOrgName),
      received_at: bid.received_at.toISOString(),
    };
  },

  async closeIfExpired(lot: AuctionLot): Promise<AuctionLot> {
    if (lot.status !== 'LIVE' || Date.now() < lot.closes_at.getTime()) return lot;
    const highest = await auctionRepo.findHighestBid(lot.id);
    const winner = highest != null && this.isReserveMet(lot, highest) ? highest : null;
    this.assertTransition(lot.status, 'ENDED');
    const updated = await auctionRepo.updateLot(lot.id, {
      status: 'ENDED',
      winning_bid_id: winner?.id ?? null,
    });
    if (winner) {
      await EscrowDomain.createHoldForWinningLot(lot, winner);
    }
    return updated ?? lot;
  },

  async getLotById(id: string): Promise<AuctionLot | null> {
    const lot = await auctionRepo.findById(id);
    if (!lot) return null;
    return this.closeIfExpired(lot);
  },

  async getPublicLotById(id: string): Promise<PublicAuctionLot | null> {
    const lot = await this.getLotById(id);
    if (!lot) return null;
    const highest = await auctionRepo.findHighestBid(lot.id);
    const bidCount = await auctionRepo.countBids(lot.id);
    return this.toPublicLot(lot, highest, bidCount);
  },

  async listPublicLots(statuses: string[]): Promise<PublicAuctionLot[]> {
    for (const lot of await auctionRepo.listLots(['LIVE'])) {
      await this.closeIfExpired(lot);
    }
    const lots = await auctionRepo.listLots(statuses);
    const hydrated: PublicAuctionLot[] = [];
    for (const lot of lots) {
      const highest = await auctionRepo.findHighestBid(lot.id);
      const bidCount = await auctionRepo.countBids(lot.id);
      hydrated.push(this.toPublicLot(lot, highest, bidCount));
    }
    return hydrated;
  },

  async createLot(params: CreateLotParams): Promise<PublicAuctionLot> {
    const now = new Date();
    const lot = await auctionRepo.createLot({
      title: params.title,
      description: params.description ?? null,
      category: params.category,
      quantity_kg: params.quantityKg.toFixed(2),
      starting_price_bdt: params.startingPrice.toFixed(2),
      reserve_price_bdt: params.reservePrice.toFixed(2),
      origin_label: params.originLabel ?? null,
      status: 'LIVE',
      opens_at: now,
      closes_at: new Date(now.getTime() + params.durationMinutes * 60_000),
      created_by: params.createdBy,
    });
    return this.toPublicLot(lot, null, 0);
  },

  async placeBid(params: {
    lotId: string;
    bidderUserId: string;
    amount: number;
  }): Promise<{ bid: PublicAuctionBid; lot: PublicAuctionLot }> {
    const loaded = await this.getLotById(params.lotId);
    if (!loaded) {
      throw new DomainRuleError('Auction lot not found', 404);
    }
    let lot = loaded;

    if (lot.status !== 'LIVE' || Date.now() >= lot.closes_at.getTime()) {
      throw new DomainRuleError('This auction has closed — bids are no longer accepted', 410);
    }

    const highest = await auctionRepo.findHighestBid(lot.id);
    const currentPrice = this.currentPriceBdt(lot, highest);
    if (params.amount < currentPrice + MIN_BID_INCREMENT_BDT) {
      throw new DomainRuleError(
        `Outbid — current price is now ৳${formatBdt(currentPrice)}. Minimum next bid is ৳${formatBdt(currentPrice + MIN_BID_INCREMENT_BDT)}.`,
        409,
        {
          current_price_bdt: currentPrice,
          min_increment_bdt: MIN_BID_INCREMENT_BDT,
          min_next_bid_bdt: currentPrice + MIN_BID_INCREMENT_BDT,
        },
      );
    }

    // Anti-snipe: a valid bid inside the final 2 minutes pushes the close out
    const now = Date.now();
    if (now >= lot.closes_at.getTime() - ANTI_SNIPE_WINDOW_MS) {
      const updated = await auctionRepo.updateLot(lot.id, { closes_at: new Date(now + ANTI_SNIPE_WINDOW_MS) });
      if (updated) lot = updated;
    }

    const bid = await auctionRepo.insertBid({
      lot_id: lot.id,
      bidder_user_id: params.bidderUserId,
      amount_bdt: params.amount.toFixed(2),
      bid_number: (highest?.bid_number ?? 0) + 1,
    });

    const bidCount = await auctionRepo.countBids(lot.id);
    const bidderPartner = await partnerRepo.findByUserId(params.bidderUserId);
    const publicBid = this.toPublicBid(bid, bidderPartner?.org_name ?? null);
    const publicLot = this.toPublicLot(lot, bid, bidCount);

    void AuctionRealtimeService.triggerBid(lot.id, { bid: publicBid, lot: publicLot });

    return { bid: publicBid, lot: publicLot };
  },
};
