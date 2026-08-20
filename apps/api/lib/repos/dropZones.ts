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

  // Pick a single active zone for a drop-off; a stub that currently ignores
  // coordinates until geo-based matching is wired up.
  async resolveByLocation() {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(dropZones)
        .where(eq(dropZones.status, 'ACTIVE'))
        .limit(1);
      return rows[0] || null;
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
          status: 'ACTIVE',
        })
        .returning();
      return zone;
    });
  },
};
