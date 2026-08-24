// Response DTOs for the public feed: one published listing row plus its page wrapper.
// Mirrors exactly what listingRepo.findPublished selects (+ the viewer's saved flag).
import { z } from 'zod';
import { CategoryEnum, ConditionEnum, ListingStatusEnum, UnitEnum } from '../../enums';

// One published listing as returned by GET /api/feed (decimals serialize as strings,
// timestamps as ISO strings, and distance_km is null unless geo filters were passed).
export const FeedListingSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  category: CategoryEnum,
  unit: UnitEnum,
  declared_weight: z.string().nullable(),
  piece_count: z.number().int().nullable(),
  declared_condition: ConditionEnum,
  price_bdt: z.string(),
  photos: z.array(z.string()),
  status: ListingStatusEnum,
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  thana: z.string().nullable(),
  zilla: z.string().nullable(),
  distance_km: z.number().nullable(),
  created_at: z.string(),
  seller_email: z.string(),
  saved: z.boolean(),
});
export type FeedListing = z.infer<typeof FeedListingSchema>;

// One keyset-paginated feed page: decorated items plus the next-page cursor.
export const FeedPageSchema = z.object({
  items: z.array(FeedListingSchema),
  nextCursor: z.string().nullable(),
});
export type FeedPage = z.infer<typeof FeedPageSchema>;
