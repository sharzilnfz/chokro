import { db, pickupOrders, dispatchAssignments, listings, partners, eq, desc, inArray, and } from '@chokro/db';
import { withDb } from './seam';

type PickupOrder = typeof pickupOrders.$inferSelect;
type Listing = typeof listings.$inferSelect;
type Partner = typeof partners.$inferSelect;

export interface PickupWithRefs {
  order: PickupOrder;
  listing: Listing;
  collector: Partner | null;
}

export interface CreatePickupInput {
  listing_id: string;
  customer_id: string;
  collector_partner_id?: string | null;
  status?: string;
  address: string;
  lat: number;
  lng: number;
  scheduled_for: Date;
  notes?: string | null;
}

export interface CreateAssignmentInput {
  order_id: string;
  collector_partner_id: string;
  stop_sequence: number;
  distance_km?: number | null;
  eta_minutes?: number | null;
}

// Statuses that still occupy the collector's day (terminal ones do not).
export const ACTIVE_PICKUP_STATUSES = ['ASSIGNED', 'EN_ROUTE'] as const;

function joinedSelection() {
  return db
    .select({
      order: pickupOrders,
      listing: listings,
      collector: partners,
    })
    .from(pickupOrders)
    .innerJoin(listings, eq(pickupOrders.listing_id, listings.id))
    .leftJoin(partners, eq(pickupOrders.collector_partner_id, partners.id));
}

export const pickupRepo = {
  async create(input: CreatePickupInput) {
    return withDb(async () => {
      const [order] = await db
        .insert(pickupOrders)
        .values({
          listing_id: input.listing_id,
          customer_id: input.customer_id,
          collector_partner_id: input.collector_partner_id ?? null,
          status: input.status || 'REQUESTED',
          address: input.address,
          lat: input.lat,
          lng: input.lng,
          scheduled_for: input.scheduled_for,
          notes: input.notes ?? null,
        })
        .returning();
      return order;
    });
  },

  async findById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(pickupOrders)
        .where(eq(pickupOrders.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findByIdWithRefs(id: string): Promise<PickupWithRefs | null> {
    return withDb(async () => {
      const rows = await joinedSelection()
        .where(eq(pickupOrders.id, id))
        .limit(1);
      const row = rows[0];
      return row || null;
    });
  },

  async findByCustomer(customerId: string): Promise<PickupWithRefs[]> {
    return withDb(async () => {
      return joinedSelection()
        .where(eq(pickupOrders.customer_id, customerId))
        .orderBy(desc(pickupOrders.created_at));
    });
  },

  async findByCollector(collectorPartnerId: string): Promise<PickupWithRefs[]> {
    return withDb(async () => {
      return joinedSelection()
        .where(eq(pickupOrders.collector_partner_id, collectorPartnerId))
        .orderBy(desc(pickupOrders.created_at));
    });
  },

  async findActiveByCollector(collectorPartnerId: string): Promise<PickupWithRefs[]> {
    return withDb(async () => {
      return joinedSelection()
        .where(and(
          eq(pickupOrders.collector_partner_id, collectorPartnerId),
          inArray(pickupOrders.status, [...ACTIVE_PICKUP_STATUSES]),
        ))
        .orderBy(pickupOrders.scheduled_for);
    });
  },

  async findActiveByCollectors(collectorPartnerIds: string[]): Promise<PickupWithRefs[]> {
    if (collectorPartnerIds.length === 0) return [];
    return withDb(async () => {
      return joinedSelection()
        .where(and(
          inArray(pickupOrders.collector_partner_id, collectorPartnerIds),
          inArray(pickupOrders.status, [...ACTIVE_PICKUP_STATUSES]),
        ))
        .orderBy(pickupOrders.scheduled_for);
    });
  },

  async assignCollector(orderId: string, collectorPartnerId: string) {
    return withDb(async () => {
      const [updated] = await db
        .update(pickupOrders)
        .set({
          collector_partner_id: collectorPartnerId,
          status: 'ASSIGNED',
          updated_at: new Date(),
        })
        .where(eq(pickupOrders.id, orderId))
        .returning();
      return updated || null;
    });
  },

  async updateStatus(id: string, status: string) {
    return withDb(async () => {
      const [updated] = await db
        .update(pickupOrders)
        .set({ status, updated_at: new Date() })
        .where(eq(pickupOrders.id, id))
        .returning();
      return updated || null;
    });
  },

  async createAssignment(input: CreateAssignmentInput) {
    return withDb(async () => {
      const [assignment] = await db
        .insert(dispatchAssignments)
        .values({
          order_id: input.order_id,
          collector_partner_id: input.collector_partner_id,
          stop_sequence: input.stop_sequence,
          distance_km: input.distance_km != null ? String(input.distance_km) : null,
          eta_minutes: input.eta_minutes ?? null,
        })
        .returning();
      return assignment;
    });
  },

  async findAssignmentsByCollector(collectorPartnerId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(dispatchAssignments)
        .where(eq(dispatchAssignments.collector_partner_id, collectorPartnerId))
        .orderBy(dispatchAssignments.stop_sequence);
    });
  },
};
