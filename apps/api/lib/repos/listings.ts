// listings repo: persistence for marketplace listings plus the filtered,
// keyset-paginated browse query behind the public catalog.
import { db, listings, users, savedListings, eq, desc, asc, and, sql } from '@chokro/db';
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
  lat?: number | null;
  lng?: number | null;
  thana?: string | null;
  zilla?: string | null;
}

// Catalog browse options: direct filters plus an optional keyset position and page size.
export interface ListingFilter {
  category?: string;
  status?: string;
  condition?: string;
  cursor?: KeysetCursor | null;
  limit?: number;
  savedFor?: string | null;
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number | null;
  thana?: string | null;
  sort?: 'distance' | 'price' | 'newest' | string | null;
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
  // and deepened with optional category/condition/geo filters and a keyset cursor.
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
      if (filter?.thana) {
        conditions.push(eq(listings.thana, filter.thana));
      }

      const hasCoords = filter?.lat != null && filter?.lng != null;
      const userLat = filter?.lat ?? 0;
      const userLng = filter?.lng ?? 0;

      if (hasCoords && filter?.radiusKm) {
        conditions.push(sql`${listings.lat} IS NOT NULL`);
        conditions.push(sql`${listings.lng} IS NOT NULL`);
        conditions.push(
          sql`(6371.0 * 2.0 * asin(sqrt(power(sin(radians(${listings.lat} - ${userLat}) / 2.0), 2) + cos(radians(${userLat})) * cos(radians(${listings.lat})) * power(sin(radians(${listings.lng} - ${userLng}) / 2.0), 2)))) <= ${filter.radiusKm}`
        );
      }

      if (filter?.cursor) {
        const cursorClause = KeysetPagination.buildCursorClause(filter.cursor, listings.created_at, listings.id);
        if (cursorClause) {
          conditions.push(cursorClause);
        }
      }

      const distanceExpression = hasCoords
        ? sql<number>`round((6371.0 * 2.0 * asin(sqrt(power(sin(radians(${listings.lat} - ${userLat}) / 2.0), 2) + cos(radians(${userLat})) * cos(radians(${listings.lat})) * power(sin(radians(${listings.lng} - ${userLng}) / 2.0), 2))))::numeric, 2)`.as('distance_km')
        : sql<null>`NULL`.as('distance_km');

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
          lat: listings.lat,
          lng: listings.lng,
          thana: listings.thana,
          zilla: listings.zilla,
          distance_km: distanceExpression,
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

      if (filter?.sort === 'distance' && hasCoords) {
        query.orderBy(
          sql`(6371.0 * 2.0 * asin(sqrt(power(sin(radians(${listings.lat} - ${userLat}) / 2.0), 2) + cos(radians(${userLat})) * cos(radians(${listings.lat})) * power(sin(radians(${listings.lng} - ${userLng}) / 2.0), 2))))`
        );
      } else if (filter?.sort === 'price') {
        query.orderBy(asc(listings.price_bdt), desc(listings.id));
      } else {
        query.orderBy(desc(listings.created_at), desc(listings.id));
      }

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
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          thana: input.thana || null,
          zilla: input.zilla || null,
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
