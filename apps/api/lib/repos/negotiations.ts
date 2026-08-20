import {
  db,
  negotiationThreads,
  negotiationOffers,
  listings,
  users,
  eq,
  and,
  or,
  desc,
  asc,
  inArray,
  alias,
} from '@chokro/db';
import { withDb } from './seam';

export type NegotiationThread = typeof negotiationThreads.$inferSelect;
export type NegotiationOffer = typeof negotiationOffers.$inferSelect;

export interface CreateThreadInput {
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status?: string;
  last_offer_id?: string | null;
}

export interface CreateOfferInput {
  thread_id: string;
  offered_by_user_id: string;
  offer_amount_bdt: number | string;
  offered_quantity: number | string;
  unit: string;
  proposed_pickup_at?: Date | null;
  notes?: string | null;
  status?: string;
  expires_at: Date;
}

const buyers = alias(users, 'buyers');
const sellers = alias(users, 'sellers');

export const negotiationRepo = {
  async createThread(input: CreateThreadInput) {
    return withDb(async () => {
      const [thread] = await db
        .insert(negotiationThreads)
        .values({
          listing_id: input.listing_id,
          buyer_id: input.buyer_id,
          seller_id: input.seller_id,
          status: input.status || 'OPEN',
          last_offer_id: input.last_offer_id ?? null,
        })
        .returning();
      return thread;
    });
  },

  async findThreadById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(negotiationThreads)
        .where(eq(negotiationThreads.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findThreadByIdWithDetails(id: string) {
    return withDb(async () => {
      const rows = await db
        .select({
          thread: negotiationThreads,
          listing: listings,
          buyer: {
            id: buyers.id,
            email: buyers.email,
            full_name: buyers.full_name,
            role: buyers.role,
          },
          seller: {
            id: sellers.id,
            email: sellers.email,
            full_name: sellers.full_name,
            role: sellers.role,
          },
        })
        .from(negotiationThreads)
        .innerJoin(listings, eq(negotiationThreads.listing_id, listings.id))
        .innerJoin(buyers, eq(negotiationThreads.buyer_id, buyers.id))
        .innerJoin(sellers, eq(negotiationThreads.seller_id, sellers.id))
        .where(eq(negotiationThreads.id, id))
        .limit(1);

      const row = rows[0];
      if (!row) return null;

      const offers = await db
        .select()
        .from(negotiationOffers)
        .where(eq(negotiationOffers.thread_id, id))
        .orderBy(asc(negotiationOffers.created_at));

      return {
        ...row.thread,
        listing: row.listing,
        buyer: row.buyer,
        seller: row.seller,
        offers,
      };
    });
  },

  async findThreadsByUser(userId: string, status?: string) {
    return withDb(async () => {
      const conditions = [
        or(
          eq(negotiationThreads.buyer_id, userId),
          eq(negotiationThreads.seller_id, userId),
        ),
      ];
      if (status) {
        conditions.push(eq(negotiationThreads.status, status));
      }

      const rows = await db
        .select({
          thread: negotiationThreads,
          listing: listings,
          buyer: {
            id: buyers.id,
            email: buyers.email,
            full_name: buyers.full_name,
            role: buyers.role,
          },
          seller: {
            id: sellers.id,
            email: sellers.email,
            full_name: sellers.full_name,
            role: sellers.role,
          },
        })
        .from(negotiationThreads)
        .innerJoin(listings, eq(negotiationThreads.listing_id, listings.id))
        .innerJoin(buyers, eq(negotiationThreads.buyer_id, buyers.id))
        .innerJoin(sellers, eq(negotiationThreads.seller_id, sellers.id))
        .where(and(...conditions))
        .orderBy(desc(negotiationThreads.updated_at), desc(negotiationThreads.created_at));

      // Hydrate with latest/active offer for each thread
      const hydrated = await Promise.all(
        rows.map(async (row) => {
          const offers = await db
            .select()
            .from(negotiationOffers)
            .where(eq(negotiationOffers.thread_id, row.thread.id))
            .orderBy(desc(negotiationOffers.created_at));

          const activeOffer = offers.find((o) => o.status === 'PENDING') || offers[0] || null;

          return {
            ...row.thread,
            listing: row.listing,
            buyer: row.buyer,
            seller: row.seller,
            active_offer: activeOffer,
            offers,
          };
        }),
      );

      return hydrated;
    });
  },

  async findThreadsByListing(listingId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(negotiationThreads)
        .where(eq(negotiationThreads.listing_id, listingId))
        .orderBy(desc(negotiationThreads.created_at));
    });
  },

  async findRivalOpenThreads(listingId: string, excludeThreadId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(negotiationThreads)
        .where(
          and(
            eq(negotiationThreads.listing_id, listingId),
            eq(negotiationThreads.status, 'OPEN'),
          ),
        );
    });
  },

  async updateThread(
    id: string,
    updates: Partial<{
      status: string;
      last_offer_id: string | null;
      updated_at: Date;
    }>,
  ) {
    return withDb(async () => {
      const [updated] = await db
        .update(negotiationThreads)
        .set({
          ...updates,
          updated_at: updates.updated_at ?? new Date(),
        })
        .where(eq(negotiationThreads.id, id))
        .returning();
      return updated || null;
    });
  },

  async createOffer(input: CreateOfferInput) {
    return withDb(async () => {
      const [offer] = await db
        .insert(negotiationOffers)
        .values({
          thread_id: input.thread_id,
          offered_by_user_id: input.offered_by_user_id,
          offer_amount_bdt: String(input.offer_amount_bdt),
          offered_quantity: String(input.offered_quantity),
          unit: input.unit,
          proposed_pickup_at: input.proposed_pickup_at ?? null,
          notes: input.notes ?? null,
          status: input.status || 'PENDING',
          expires_at: input.expires_at,
        })
        .returning();
      return offer;
    });
  },

  async findOfferById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(negotiationOffers)
        .where(eq(negotiationOffers.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findOffersByThread(threadId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(negotiationOffers)
        .where(eq(negotiationOffers.thread_id, threadId))
        .orderBy(asc(negotiationOffers.created_at));
    });
  },

  async findActiveOfferByThread(threadId: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(negotiationOffers)
        .where(
          and(
            eq(negotiationOffers.thread_id, threadId),
            eq(negotiationOffers.status, 'PENDING'),
          ),
        )
        .orderBy(desc(negotiationOffers.created_at))
        .limit(1);
      return rows[0] || null;
    });
  },

  async supersedePendingOffersInThread(threadId: string, exceptOfferId?: string) {
    return withDb(async () => {
      const activeOffers = await db
        .select()
        .from(negotiationOffers)
        .where(
          and(
            eq(negotiationOffers.thread_id, threadId),
            eq(negotiationOffers.status, 'PENDING'),
          ),
        );

      const toSupersede = exceptOfferId
        ? activeOffers.filter((o) => o.id !== exceptOfferId)
        : activeOffers;

      if (toSupersede.length === 0) return [];

      const ids = toSupersede.map((o) => o.id);
      return db
        .update(negotiationOffers)
        .set({ status: 'SUPERSEDED' })
        .where(inArray(negotiationOffers.id, ids))
        .returning();
    });
  },

  async updateOfferStatus(id: string, status: string) {
    return withDb(async () => {
      const [updated] = await db
        .update(negotiationOffers)
        .set({ status })
        .where(eq(negotiationOffers.id, id))
        .returning();
      return updated || null;
    });
  },

  async supersedeRivalsOnListing(listingId: string, winningThreadId: string) {
    return withDb(async () => {
      // Find all other open threads for this listing
      const rivalThreads = await db
        .select()
        .from(negotiationThreads)
        .where(
          and(
            eq(negotiationThreads.listing_id, listingId),
            eq(negotiationThreads.status, 'OPEN'),
          ),
        );

      const threadsToClose = rivalThreads.filter((t) => t.id !== winningThreadId);
      if (threadsToClose.length === 0) return { closedThreads: [], closedOffers: [] };

      const threadIds = threadsToClose.map((t) => t.id);

      // Close rival threads
      const closedThreads = await db
        .update(negotiationThreads)
        .set({
          status: 'SUPERSEDED_BY_SALE',
          updated_at: new Date(),
        })
        .where(inArray(negotiationThreads.id, threadIds))
        .returning();

      // Supersede pending offers in rival threads
      const closedOffers = await db
        .update(negotiationOffers)
        .set({ status: 'SUPERSEDED_BY_SALE' })
        .where(
          and(
            inArray(negotiationOffers.thread_id, threadIds),
            eq(negotiationOffers.status, 'PENDING'),
          ),
        )
        .returning();

      return { closedThreads, closedOffers };
    });
  },
};
