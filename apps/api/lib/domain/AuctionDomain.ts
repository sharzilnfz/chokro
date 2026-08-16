import { auctionRepo, type AuctionBid, type AuctionLot } from '@/lib/repos/auctions';
import { partnerRepo } from '@/lib/repos/partners';
import { AuctionRealtimeService } from '@/lib/services/AuctionRealtimeService';

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

/** Domain rule violation that maps directly onto an HTTP error response. */
export class AuctionRuleError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AuctionRuleError';
  }
}

// Type aliases (not interfaces) so payloads stay assignable to Record<string, unknown>
// when handed to the realtime service.
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
}

export type PublicAuctionBid = {
  id: string;
  lot_id: string;
  bid_number: number;
  amount_bdt: number;
  bidder_user_id: string;
  bidder_org_name: string;
  received_at: string;
}

function bidderLabel(bidderUserId: string, orgName: string | null): string {
  return orgName ?? `Bidder #${bidderUserId.slice(0, 8)}`;
}

function formatBdt(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

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

  /**
   * PUBLIC serialization of a lot. The sealed reserve_price_bdt is deliberately
   * stripped — clients only ever learn whether it was met (reserve_met boolean).
   */
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

  /**
   * Lazy close: transitions an expired LIVE lot to ENDED and stamps the winning
   * bid when one exists at or above the sealed reserve (otherwise no sale).
   */
  async closeIfExpired(lot: AuctionLot): Promise<AuctionLot> {
    if (lot.status !== 'LIVE' || Date.now() < lot.closes_at.getTime()) return lot;
    const highest = await auctionRepo.findHighestBid(lot.id);
    const winner = highest != null && this.isReserveMet(lot, highest) ? highest : null;
    this.assertTransition(lot.status, 'ENDED');
    const updated = await auctionRepo.updateLot(lot.id, {
      status: 'ENDED',
      winning_bid_id: winner?.id ?? null,
    });
    return updated ?? lot;
  },

  /** Loads one lot, lazily closing it first when expired. */
  async getLotById(id: string): Promise<AuctionLot | null> {
    const lot = await auctionRepo.findById(id);
    if (!lot) return null;
    return this.closeIfExpired(lot);
  },

  async listPublicLots(statuses: string[]): Promise<PublicAuctionLot[]> {
    // Lazy-close pass so expired LIVE lots show as ENDED on every read.
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

  /**
   * Server-authoritative bid placement. Order of guarantees:
   * lazy-close → LIVE + open check → minimum-increment (৳50 above current
   * price) check → anti-snipe extension → monotonic bid_number assignment →
   * insert → best-effort realtime push.
   */
  async placeBid(params: {
    lotId: string;
    bidderUserId: string;
    amount: number;
  }): Promise<{ bid: PublicAuctionBid; lot: PublicAuctionLot }> {
    const loaded = await this.getLotById(params.lotId);
    if (!loaded) {
      throw new AuctionRuleError('Auction lot not found', 404);
    }
    let lot = loaded;

    if (lot.status !== 'LIVE' || Date.now() >= lot.closes_at.getTime()) {
      throw new AuctionRuleError('This auction has closed — bids are no longer accepted', 410);
    }

    const highest = await auctionRepo.findHighestBid(lot.id);
    const currentPrice = this.currentPriceBdt(lot, highest);
    if (params.amount < currentPrice + MIN_BID_INCREMENT_BDT) {
      throw new AuctionRuleError(
        `Outbid — current price is now ৳${formatBdt(currentPrice)}. Minimum next bid is ৳${formatBdt(currentPrice + MIN_BID_INCREMENT_BDT)}.`,
        409,
        {
          current_price_bdt: currentPrice,
          min_increment_bdt: MIN_BID_INCREMENT_BDT,
          min_next_bid_bdt: currentPrice + MIN_BID_INCREMENT_BDT,
        },
      );
    }

    // Anti-snipe: a valid bid inside the final 2 minutes pushes the close out.
    const now = Date.now();
    if (now >= lot.closes_at.getTime() - ANTI_SNIPE_WINDOW_MS) {
      const updated = await auctionRepo.updateLot(lot.id, { closes_at: new Date(now + ANTI_SNIPE_WINDOW_MS) });
      if (updated) lot = updated;
    }

    const bid = await auctionRepo.insertBid({
      lot_id: lot.id,
      bidder_user_id: params.bidderUserId,
      amount_bdt: params.amount.toFixed(2),
      // Monotonic per-lot sequence assigned by the server on acceptance:
      // a bid only counts if the server accepted it first.
      bid_number: (highest?.bid_number ?? 0) + 1,
    });

    const bidCount = await auctionRepo.countBids(lot.id);
    const bidderPartner = await partnerRepo.findByUserId(params.bidderUserId);
    const publicBid = this.toPublicBid(bid, bidderPartner?.org_name ?? null);
    const publicLot = this.toPublicLot(lot, bid, bidCount);

    // Best-effort live push; polling remains the guaranteed fallback.
    void AuctionRealtimeService.triggerBid(lot.id, { bid: publicBid, lot: publicLot });

    return { bid: publicBid, lot: publicLot };
  },
};
