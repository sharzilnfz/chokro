import { db, savedListings, eq, and } from '@chokro/db';
import { withDb } from './seam';

export const savedListingRepo = {
  async isSaved(userId: string, listingId: string) {
    return withDb(async () => {
      const rows = await db
        .select({ id: savedListings.id })
        .from(savedListings)
        .where(and(
          eq(savedListings.user_id, userId),
          eq(savedListings.listing_id, listingId),
        ))
        .limit(1);
      return rows.length > 0;
    });
  },

  async save(userId: string, listingId: string) {
    return withDb(async () => {
      await db
        .insert(savedListings)
        .values({ user_id: userId, listing_id: listingId })
        .onConflictDoNothing();
    });
  },

  async unsave(userId: string, listingId: string) {
    return withDb(async () => {
      await db
        .delete(savedListings)
        .where(and(
          eq(savedListings.user_id, userId),
          eq(savedListings.listing_id, listingId),
        ));
    });
  },

  async findSavedListingIds(userId: string): Promise<string[]> {
    return withDb(async () => {
      const rows = await db
        .select({ listing_id: savedListings.listing_id })
        .from(savedListings)
        .where(eq(savedListings.user_id, userId));
      return rows.map((row) => row.listing_id);
    });
  },
};