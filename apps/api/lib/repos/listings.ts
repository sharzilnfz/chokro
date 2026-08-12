import { db, listings, eq, desc, and, lt, or } from '@chokro/db';
import { withDb } from './seam';
import { KeysetPagination } from '../domain/KeysetPagination';

export interface ListingCursor {
  createdAt: string;
  id: string;
}

export interface CreateListingInput {
  ownerId?: string;
  owner_id?: string;
  category: string;
  unit: string;
  declaredWeight?: number | string | null;
  declared_weight?: number | string | null;
  pieceCount?: number | null;
  piece_count?: number | null;
  declaredCondition?: string;
  declared_condition?: string;
  photos?: string[];
  status?: string;
}

export interface ListingFilter {
  category?: string;
  status?: string;
  condition?: string;
  cursor?: ListingCursor | null;
  limit?: number;
}

export const listingRepo = {
  async findById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(listings)
        .where(eq(listings.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findByOwner(ownerId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(listings)
        .where(eq(listings.owner_id, ownerId))
        .orderBy(desc(listings.created_at));
    });
  },

  async findByOwnerId(ownerId: string) {
    return this.findByOwner(ownerId);
  },

  async findPublished(filter?: ListingFilter) {
    return withDb(async () => {
      const status = filter?.status || 'ACTIVE';
      const conditions = [eq(listings.status, status)];
      if (filter?.category) {
        conditions.push(eq(listings.category, filter.category));
      }
      if (filter?.condition) {
        conditions.push(eq(listings.declared_condition, filter.condition));
      }
      if (filter?.cursor) {
        const cursorClause = KeysetPagination.buildCursorClause(filter.cursor, listings.created_at, listings.id);
        if (cursorClause) {
          conditions.push(cursorClause);
        }
      }

      const query = db.select().from(listings);
      const whereClause = and(...conditions);
      if (whereClause) {
        query.where(whereClause);
      }
      query.orderBy(desc(listings.created_at), desc(listings.id));

      if (filter?.limit) {
        query.limit(filter.limit + 1);
      }

      return query;
    });
  },

  async findFeedItems(filter?: ListingFilter) {
    return this.findPublished(filter);
  },

  async create(input: CreateListingInput) {
    return withDb(async () => {
      const ownerId = input.owner_id || input.ownerId || '';
      const declaredWeight = input.declared_weight ?? input.declaredWeight;
      const pieceCount = input.piece_count ?? input.pieceCount ?? null;
      const declaredCondition = input.declared_condition || input.declaredCondition || 'GOOD';

      const [listing] = await db
        .insert(listings)
        .values({
          owner_id: ownerId,
          category: input.category,
          unit: input.unit,
          declared_weight: declaredWeight != null ? String(declaredWeight) : null,
          piece_count: pieceCount,
          declared_condition: declaredCondition,
          photos: input.photos || [],
          status: input.status || 'ACTIVE',
        })
        .returning();
      return listing;
    });
  },

  async updateStatus(id: string, status: string) {
    return withDb(async () => {
      const [updated] = await db
        .update(listings)
        .set({ status })
        .where(eq(listings.id, id))
        .returning();
      return updated || null;
    });
  },
};
