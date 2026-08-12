import { listings, memoryStore } from '@chokro/db';
import { and, desc, eq, lt, or } from 'drizzle-orm';
import crypto from 'crypto';
import { withDb, createRepoSeam } from './seam';

export type CreateListingInput = {
  owner_id: string;
  category: string;
  unit: string;
  declared_weight: string | null;
  piece_count: number | null;
  declared_condition: string;
  photos: string[];
  status: string;
};

export type FindFeedItemsParams = {
  category?: string | null;
  condition?: string | null;
  cursor?: { createdAt: string; id: string } | null;
  limit: number;
};

export interface ListingRepo {
  create(values: CreateListingInput): Promise<typeof listings.$inferSelect>;
  findByOwnerId(ownerId: string): Promise<Array<typeof listings.$inferSelect>>;
  findById(id: string): Promise<typeof listings.$inferSelect | undefined | null>;
  updateStatus(id: string, status: string): Promise<typeof listings.$inferSelect | undefined | null>;
  findFeedItems(params: FindFeedItemsParams): Promise<Array<typeof listings.$inferSelect>>;
}

export const drizzleListingRepo: ListingRepo = {
  async create(values: CreateListingInput) {
    return withDb(async (db) => (await db.insert(listings).values(values).returning())[0]);
  },

  async findByOwnerId(ownerId: string) {
    return withDb(async (db) => db.select().from(listings).where(eq(listings.owner_id, ownerId)));
  },

  async findById(id: string) {
    return withDb(async (db) => (await db.select().from(listings).where(eq(listings.id, id)))[0] ?? null);
  },

  async updateStatus(id: string, status: string) {
    return withDb(async (db) => (await db.update(listings).set({ status }).where(eq(listings.id, id)).returning())[0] ?? null);
  },

  async findFeedItems({ category, condition, cursor, limit }: FindFeedItemsParams) {
    const filters = [eq(listings.status, 'ACTIVE')];
    if (category) filters.push(eq(listings.category, category));
    if (condition) filters.push(eq(listings.declared_condition, condition));
    if (cursor) {
      const createdAt = new Date(cursor.createdAt);
      filters.push(
        or(
          lt(listings.created_at, createdAt),
          and(eq(listings.created_at, createdAt), lt(listings.id, cursor.id)),
        )!,
      );
    }

    return withDb(async (db) =>
      db
        .select()
        .from(listings)
        .where(and(...filters))
        .orderBy(desc(listings.created_at), desc(listings.id))
        .limit(limit + 1),
    );
  },
};

export const memoryListingRepo: ListingRepo = {
  async create(values: CreateListingInput) {
    const listing = {
      id: crypto.randomUUID(),
      ...values,
      created_at: new Date(),
    };
    memoryStore.listings.push(listing);
    return listing as any;
  },

  async findByOwnerId(ownerId: string) {
    return memoryStore.listings.filter((item) => item.owner_id === ownerId);
  },

  async findById(id: string) {
    return memoryStore.listings.find((item) => item.id === id) ?? null;
  },

  async updateStatus(id: string, status: string) {
    const existing = memoryStore.listings.find((item) => item.id === id);
    if (existing) {
      existing.status = status;
    }
    return existing ?? null;
  },

  async findFeedItems({ category, condition, cursor, limit }: FindFeedItemsParams) {
    return memoryStore.listings
      .filter((item) => {
        if (item.status !== 'ACTIVE' || (category && item.category !== category) || (condition && item.declared_condition !== condition)) return false;
        if (!cursor) return true;
        const itemTime = new Date(item.created_at).getTime();
        const cursorTime = new Date(cursor.createdAt).getTime();
        return itemTime < cursorTime || (itemTime === cursorTime && item.id < cursor.id);
      })
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime() || right.id.localeCompare(left.id))
      .slice(0, limit + 1);
  },
};

export const listingRepo: ListingRepo = createRepoSeam(drizzleListingRepo, memoryListingRepo);
