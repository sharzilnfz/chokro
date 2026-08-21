// dropZoneTelemetry repo: persistence for zone fill telemetry, capacity logs,
// automated dispatch pickup orders, and poster QR token rotation (SPEC 19).
import { db, dropZones, zoneCapacityLogs, pickupOrders, eq, desc } from '@chokro/db';
import { withDb } from './seam';

export interface UpdateFillStateInput {
  currentFillKg: string;
  emptiedAt?: Date | null;
}

export interface CreateCapacityLogInput {
  zone_id: string;
  recorded_fill_kg: string;
  capacity_percentage: number;
  status: string;
  trigger_reason: string;
  logged_at: Date;
}

export interface CreateDispatchOrderInput {
  collector_partner_id?: string | null;
  address: string;
  lat: number;
  lng: number;
  scheduled_for: Date;
  notes: string;
}

export const dropZoneTelemetryRepo = {
  async findZoneById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(dropZones)
        .where(eq(dropZones.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async updateFillState(id: string, input: UpdateFillStateInput) {
    return withDb(async () => {
      const [updated] = await db
        .update(dropZones)
        .set({
          current_fill_kg: input.currentFillKg,
          ...(input.emptiedAt ? { last_emptied_at: input.emptiedAt } : {}),
        })
        .where(eq(dropZones.id, id))
        .returning();
      return updated || null;
    });
  },

  async updateQrToken(id: string, qrToken: string) {
    return withDb(async () => {
      const [updated] = await db
        .update(dropZones)
        .set({ qr_token: qrToken })
        .where(eq(dropZones.id, id))
        .returning();
      return updated || null;
    });
  },

  async createCapacityLog(input: CreateCapacityLogInput) {
    return withDb(async () => {
      const [logEntry] = await db
        .insert(zoneCapacityLogs)
        .values({
          zone_id: input.zone_id,
          recorded_fill_kg: input.recorded_fill_kg,
          capacity_percentage: input.capacity_percentage,
          status: input.status,
          trigger_reason: input.trigger_reason,
          logged_at: input.logged_at,
        })
        .returning();
      return logEntry;
    });
  },

  async listRecentCapacityLogs(limit = 50) {
    return withDb(async () => {
      return db
        .select({
          id: zoneCapacityLogs.id,
          zoneId: zoneCapacityLogs.zone_id,
          recordedFillKg: zoneCapacityLogs.recorded_fill_kg,
          capacityPercentage: zoneCapacityLogs.capacity_percentage,
          status: zoneCapacityLogs.status,
          triggerReason: zoneCapacityLogs.trigger_reason,
          loggedAt: zoneCapacityLogs.logged_at,
          zoneName: dropZones.name,
          institutionId: dropZones.institution_id,
        })
        .from(zoneCapacityLogs)
        .innerJoin(dropZones, eq(zoneCapacityLogs.zone_id, dropZones.id))
        .orderBy(desc(zoneCapacityLogs.logged_at))
        .limit(limit);
    });
  },

  async findAllZones() {
    return withDb(async () => {
      return db.select().from(dropZones).orderBy(desc(dropZones.created_at));
    });
  },

  async findActiveZones() {
    return withDb(async () => {
      return db
        .select()
        .from(dropZones)
        .where(eq(dropZones.status, 'ACTIVE'));
    });
  },

  async createDispatchOrder(input: CreateDispatchOrderInput) {
    return withDb(async () => {
      const [createdOrder] = await db
        .insert(pickupOrders)
        .values({
          customer_id: null,
          collector_partner_id: input.collector_partner_id || null,
          status: 'REQUESTED',
          address: input.address,
          lat: input.lat,
          lng: input.lng,
          scheduled_for: input.scheduled_for,
          notes: input.notes,
        })
        .returning();
      return createdOrder;
    });
  },
};
