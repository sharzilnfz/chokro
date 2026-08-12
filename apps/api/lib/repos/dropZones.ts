import { db, dropZones, eq, desc } from '@chokro/db';
import { createQrToken } from '../qr';
import { withDb } from './seam';

export interface CreateDropZoneInput {
  institutionId: string;
  name: string;
  acceptedCategories: string[];
  geoLocation?: { lat: number; lng: number } | null;
}

export const dropZoneRepo = {
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

  async findAll() {
    return withDb(async () => {
      return db
        .select()
        .from(dropZones)
        .orderBy(desc(dropZones.created_at));
    });
  },

  async resolveByLocation(_lat: number, _lng: number) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(dropZones)
        .where(eq(dropZones.status, 'ACTIVE'))
        .limit(1);
      return rows[0] || null;
    });
  },

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
