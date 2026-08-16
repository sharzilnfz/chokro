import { db, auctionLots, auctionBids, partners, eq, desc, inArray } from '@chokro/db';
import { withDb } from './seam';

export type AuctionLot = typeof auctionLots.$inferSelect;
export type AuctionBid = typeof auctionBids.$inferSelect;

export interface CreateLotInput {
  title: string;
  description?: string | null;
  category: string;
  quantity_kg: string;
  starting_price_bdt: string;
  reserve_price_bdt: string;
  origin_label?: string | null;
  status: string;
  opens_at: Date;
  closes_at: Date;
  created_by: string;
}

export interface InsertBidInput {
  lot_id: string;
  bidder_user_id: string;
  amount_bdt: string;
  bid_number: number;
}

export interface BidWithBidder {
  bid: AuctionBid;
  bidder_org_name: string | null;
}

export interface UpdateLotInput {
  status?: string;
  closes_at?: Date;
  winning_bid_id?: string | null;
}

export const auctionRepo = {
  async createLot(input: CreateLotInput) {
    return withDb(async () => {
      const [lot] = await db
        .insert(auctionLots)
        .values({
          title: input.title,
          description: input.description ?? null,
          category: input.category,
          quantity_kg: input.quantity_kg,
          starting_price_bdt: input.starting_price_bdt,
          reserve_price_bdt: input.reserve_price_bdt,
          origin_label: input.origin_label ?? null,
          status: input.status,
          opens_at: input.opens_at,
          closes_at: input.closes_at,
          created_by: input.created_by,
        })
        .returning();
      return lot;
    });
  },

  async findById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(auctionLots)
        .where(eq(auctionLots.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async listLots(statuses: string[]) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(auctionLots)
        .where(inArray(auctionLots.status, statuses));
      // LIVE lots first by soonest close; terminal lots most recently closed first.
      return rows.sort((a, b) => {
        const aLive = a.status === 'LIVE';
        const bLive = b.status === 'LIVE';
        if (aLive !== bLive) return aLive ? -1 : 1;
        return aLive
          ? a.closes_at.getTime() - b.closes_at.getTime()
          : b.closes_at.getTime() - a.closes_at.getTime();
      });
    });
  },

  async findBidsByLot(lotId: string, limit = 20): Promise<BidWithBidder[]> {
    return withDb(async () => {
      const rows = await db
        .select({ bid: auctionBids, bidder_org_name: partners.org_name })
        .from(auctionBids)
        .leftJoin(partners, eq(auctionBids.bidder_user_id, partners.user_id))
        .where(eq(auctionBids.lot_id, lotId))
        .orderBy(desc(auctionBids.bid_number))
        .limit(limit);
      return rows;
    });
  },

  async findHighestBid(lotId: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(auctionBids)
        .where(eq(auctionBids.lot_id, lotId))
        .orderBy(desc(auctionBids.bid_number))
        .limit(1);
      return rows[0] || null;
    });
  },

  async insertBid(input: InsertBidInput) {
    return withDb(async () => {
      const [bid] = await db
        .insert(auctionBids)
        .values({
          lot_id: input.lot_id,
          bidder_user_id: input.bidder_user_id,
          amount_bdt: input.amount_bdt,
          bid_number: input.bid_number,
        })
        .returning();
      return bid;
    });
  },

  async updateLot(id: string, patch: UpdateLotInput) {
    return withDb(async () => {
      const [updated] = await db
        .update(auctionLots)
        .set({ ...patch, updated_at: new Date() })
        .where(eq(auctionLots.id, id))
        .returning();
      return updated || null;
    });
  },

  async countBids(lotId: string) {
    return withDb(async () => {
      const rows = await db
        .select({ id: auctionBids.id })
        .from(auctionBids)
        .where(eq(auctionBids.lot_id, lotId));
      return rows.length;
    });
  },
};
