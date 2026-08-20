import { db, listingMedia, eq } from '@chokro/db';
import { withDb } from './seam';

export interface InsertListingMediaParams {
  id?: string;
  listing_id?: string | null;
  uploader_id: string;
  storage_provider?: string;
  public_url: string;
  thumbnail_url: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  width?: number | null;
  height?: number | null;
  exif_gps_extracted?: boolean;
  extracted_lat?: number | null;
  extracted_lng?: number | null;
  is_privacy_stripped?: boolean;
}

export const listingMediaRepo = {
  create: (params: InsertListingMediaParams) =>
    withDb(async (dbClient) => {
      const [record] = await dbClient
        .insert(listingMedia)
        .values({
          ...params,
          listing_id: params.listing_id || null,
          storage_provider: params.storage_provider || 'CLOUDINARY',
          exif_gps_extracted: params.exif_gps_extracted ?? false,
          is_privacy_stripped: params.is_privacy_stripped ?? true,
        })
        .returning();
      return record;
    }),

  findById: (id: string) =>
    withDb(async (dbClient) => {
      const rows = await dbClient.select().from(listingMedia).where(eq(listingMedia.id, id)).limit(1);
      return rows[0] || null;
    }),

  findByListingId: (listingId: string) =>
    withDb(async (dbClient) => {
      return dbClient.select().from(listingMedia).where(eq(listingMedia.listing_id, listingId));
    }),

  countByListingId: (listingId: string) =>
    withDb(async (dbClient) => {
      const rows = await dbClient.select().from(listingMedia).where(eq(listingMedia.listing_id, listingId));
      return rows.length;
    }),

  deleteById: (id: string) =>
    withDb(async (dbClient) => {
      const [deleted] = await dbClient.delete(listingMedia).where(eq(listingMedia.id, id)).returning();
      return deleted || null;
    }),
};
