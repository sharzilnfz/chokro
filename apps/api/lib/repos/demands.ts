// Demands repo: persistence for standing recycler demands and auto-matches (SPEC 17)
import { db, buyerDemands, demandMatches, listings, users, eq, desc, and, inArray, sql } from '@chokro/db';
import { withDb } from './seam';

export interface CreateDemandInput {
  buyer_id: string;
  category: string;
  min_quantity: number | string;
  max_quantity?: number | string | null;
  unit: string;
  max_price_per_unit_bdt: number | string;
  target_thana?: string | null;
  target_lat?: number | null;
  target_lng?: number | null;
  max_radius_km?: number;
  duration_days?: number;
}

export interface CreateMatchInput {
  demand_id: string;
  listing_id: string;
  match_score: number | string;
  distance_km?: number | string | null;
  notification_sent?: boolean;
  status?: string;
}

export const demandRepo = {
  // Create a standing demand
  async createDemand(input: CreateDemandInput) {
    return withDb(async () => {
      const days = input.duration_days ?? 30;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const [demand] = await db
        .insert(buyerDemands)
        .values({
          buyer_id: input.buyer_id,
          category: input.category,
          min_quantity: String(input.min_quantity),
          max_quantity: input.max_quantity != null ? String(input.max_quantity) : null,
          unit: input.unit,
          max_price_per_unit_bdt: String(input.max_price_per_unit_bdt),
          target_thana: input.target_thana || null,
          target_lat: input.target_lat ?? null,
          target_lng: input.target_lng ?? null,
          max_radius_km: input.max_radius_km ?? 10,
          status: 'ACTIVE',
          expires_at: expiresAt,
        })
        .returning();
      return demand;
    });
  },

  async findDemandById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(buyerDemands)
        .where(eq(buyerDemands.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findDemandsByBuyer(buyerId: string, status?: string) {
    return withDb(async () => {
      const conditions = [eq(buyerDemands.buyer_id, buyerId)];
      if (status) {
        conditions.push(eq(buyerDemands.status, status));
      }
      return db
        .select()
        .from(buyerDemands)
        .where(and(...conditions))
        .orderBy(desc(buyerDemands.created_at));
    });
  },

  async findActiveDemandsByCategory(category: string, unit: string) {
    return withDb(async () => {
      return db
        .select()
        .from(buyerDemands)
        .where(
          and(
            eq(buyerDemands.category, category),
            eq(buyerDemands.unit, unit),
            eq(buyerDemands.status, 'ACTIVE'),
            sql`${buyerDemands.expires_at} > NOW()`
          )
        );
    });
  },

  async updateDemandStatus(id: string, status: string) {
    return withDb(async () => {
      const [updated] = await db
        .update(buyerDemands)
        .set({ status })
        .where(eq(buyerDemands.id, id))
        .returning();
      return updated || null;
    });
  },

  // Match records
  async createMatch(input: CreateMatchInput) {
    return withDb(async () => {
      const [match] = await db
        .insert(demandMatches)
        .values({
          demand_id: input.demand_id,
          listing_id: input.listing_id,
          match_score: String(input.match_score),
          distance_km: input.distance_km != null ? String(input.distance_km) : null,
          notification_sent: input.notification_sent ?? false,
          status: input.status ?? 'UNNOTICED',
        })
        .returning();
      return match;
    });
  },

  async findMatchesForBuyer(buyerId: string, demandId?: string, status?: string) {
    return withDb(async () => {
      const query = db
        .select({
          id: demandMatches.id,
          demand_id: demandMatches.demand_id,
          listing_id: demandMatches.listing_id,
          match_score: demandMatches.match_score,
          distance_km: demandMatches.distance_km,
          notification_sent: demandMatches.notification_sent,
          status: demandMatches.status,
          created_at: demandMatches.created_at,
          listing: {
            id: listings.id,
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
            created_at: listings.created_at,
            seller_email: users.email,
          },
          demand: {
            id: buyerDemands.id,
            category: buyerDemands.category,
            min_quantity: buyerDemands.min_quantity,
            max_quantity: buyerDemands.max_quantity,
            unit: buyerDemands.unit,
            max_price_per_unit_bdt: buyerDemands.max_price_per_unit_bdt,
            target_thana: buyerDemands.target_thana,
          },
        })
        .from(demandMatches)
        .innerJoin(buyerDemands, eq(buyerDemands.id, demandMatches.demand_id))
        .innerJoin(listings, eq(listings.id, demandMatches.listing_id))
        .innerJoin(users, eq(users.id, listings.owner_id));

      const conditions = [eq(buyerDemands.buyer_id, buyerId)];
      if (demandId) {
        conditions.push(eq(demandMatches.demand_id, demandId));
      }
      if (status) {
        conditions.push(eq(demandMatches.status, status));
      }

      query.where(and(...conditions));
      query.orderBy(desc(demandMatches.created_at));
      return query;
    });
  },

  async updateMatchStatus(id: string, status: string) {
    return withDb(async () => {
      const [updated] = await db
        .update(demandMatches)
        .set({ status })
        .where(eq(demandMatches.id, id))
        .returning();
      return updated || null;
    });
  },
};
