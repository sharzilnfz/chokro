// dropZones repo: persistence of spot/drop-off zones, including minting the QR
// token that physically identifies each zone.
//
// Drizzle drop-zone table, QR token generator, and the DB seam.
import { db, dropZones, eq, desc } from '@chokro/db';
import { createQrToken } from '../qr';
import { withDb } from './seam';

// Values accepted when establishing a new drop zone.
export interface CreateDropZoneInput {
  institutionId: string;
  name: string;
  acceptedCategories: string[];
  geoLocation?: { lat: number; lng: number } | null;
  maxCapacityKg?: number | string | null;
  contractedPartnerId?: string | null;
  status?: string;
}

export const dropZoneRepo = {
  // Lookup by primary key.
  async findById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(dropZones)
        .where(eq(dropZones.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  // Lookup by printed QR token — the scan path at a physical zone.
  async findByQrToken(token: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(dropZones)
        .where(eq(dropZones.qr_token, token))
        .limit(1);
      return rows[0] || null;
    });
  },

  // Every zone, newest first (admin console).
  async findAll() {
    return withDb(async () => {
      return db
        .select()
        .from(dropZones)
        .orderBy(desc(dropZones.created_at));
    });
  },

  // Pick the nearest active zone for a drop-off using Haversine formula bounded by maxRadiusKm.
  async resolveByLocation(lat?: number | null, lng?: number | null, maxRadiusKm = 10) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(dropZones)
        .where(eq(dropZones.status, 'ACTIVE'));

      if (!rows.length) return null;
      if (lat === undefined || lat === null || lng === undefined || lng === null) {
        return rows[0] || null;
      }

      function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Earth radius in km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }

      const withDistances = rows
        .map((zone) => {
          const geo = zone.geo_location as { lat: number; lng: number } | null;
          if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') {
            return null;
          }
          const dist = haversineDistance(lat, lng, geo.lat, geo.lng);
          return { zone, distanceKm: dist };
        })
        .filter((item): item is { zone: (typeof rows)[0]; distanceKm: number } => item !== null && item.distanceKm <= maxRadiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      return withDistances[0]?.zone || null;
    });
  },

  // Establish a zone: a fresh QR token is minted at creation and stored with the row.
  async create(input: CreateDropZoneInput) {
    return withDb(async () => {
      const qrToken = createQrToken();
      const [zone] = await db
        .insert(dropZones)
        .values({
          institution_id: input.institutionId,
          name: input.name,
          geo_location: input.geoLocation || null,
          qr_token: qrToken,
          accepted_categories: input.acceptedCategories,
          status: input.status || 'ACTIVE',
          max_capacity_kg: input.maxCapacityKg != null ? String(input.maxCapacityKg) : '50.00',
          current_fill_kg: '0.00',
          contracted_partner_id: input.contractedPartnerId || null,
        })
        .returning();
      return zone;
    });
  },

  // Update drop zone record fields.
  async update(id: string, partial: Partial<typeof dropZones.$inferInsert>) {
    return withDb(async () => {
      const [updated] = await db
        .update(dropZones)
        .set(partial)
        .where(eq(dropZones.id, id))
        .returning();
      return updated || null;
    });
  },
};
