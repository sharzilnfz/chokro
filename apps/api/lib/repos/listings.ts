// listings repo: persistence for marketplace listings plus the filtered,
// keyset-paginated browse query behind the public catalog.
import { db, listings, users, savedListings, eq, desc, and } from '@chokro/db';
import { withDb } from './seam';
import { KeysetPagination } from '../domain/KeysetPagination';
import type { KeysetCursor } from '../domain/KeysetPagination';

// Row-shaped insert payload for a listing.
export interface CreateListingInput {
  owner_id: string;
  category: string;
  unit: string;
  declared_weight?: number | string | null;
  piece_count?: number | null;
  declared_condition?: string;
  price_bdt: number | string;
  photos?: string[];
  status?: string;
}

// Catalog browse options: direct filters plus an optional keyset position and page size.
export interface ListingFilter {
  category?: string;
  status?: string;
  condition?: string;
  cursor?: KeysetCursor | null;
  limit?: number;
  savedFor?: string | null;
}

export const listingRepo = {
  // Lookup by primary key.
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

  // A seller's own listings, newest first.
  async findByOwner(ownerId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(listings)
        .where(eq(listings.owner_id, ownerId))
        .orderBy(desc(listings.created_at));
    });
  },

  // Public catalog browse: always scoped to the requested status (ACTIVE by default)
  // and deepened with optional category/condition filters and a keyset cursor.
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

const query = db
        .select({
          id: listings.id,
          owner_id: listings.owner_id,
          category: listings.category,
          unit: listings.unit,
          declared_weight: listings.declared_weight,
          piece_count: listings.piece_count,
          declared_condition: listings.declared_condition,
          price_bdt: listings.price_bdt,
          photos: listings.photos,
          status: listings.status,
          created_at: listings.created_at,
          seller_email: users.email,
        })
        .from(listings)
        .innerJoin(users, eq(users.id, listings.owner_id));

      if (filter?.savedFor) {
        query.innerJoin(
          savedListings,
          and(
            eq(savedListings.listing_id, listings.id),
            eq(savedListings.user_id, filter.savedFor),
          ),
        );
      }

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

  // Insert a listing; weight is stored as a string column, condition/status default.
  async create(input: CreateListingInput) {
    return withDb(async () => {
      const [listing] = await db
        .insert(listings)
        .values({
          owner_id: input.owner_id,
          category: input.category,
          unit: input.unit,
          declared_weight: input.declared_weight != null ? String(input.declared_weight) : null,
          piece_count: input.piece_count ?? null,
          declared_condition: input.declared_condition || 'GOOD',
          price_bdt: String(input.price_bdt),
          photos: input.photos || [],
          status: input.status || 'ACTIVE',
        })
        .returning();
      return listing;
    });
  },

  // Persist a listing's status change.
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