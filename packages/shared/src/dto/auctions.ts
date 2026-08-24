import { z } from 'zod';
import { CategoryEnum } from '../enums';

export const AuctionLotStatusEnum = z.enum(['DRAFT', 'LIVE', 'ENDED', 'CANCELLED']);
export type AuctionLotStatus = z.infer<typeof AuctionLotStatusEnum>;

export const AUCTION_LOT_STATUSES = AuctionLotStatusEnum.options;

export const CreateAuctionLotSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().max(2000).optional(),
  category: CategoryEnum,
  quantityKg: z.number().positive().finite(),
  startingPrice: z.number().min(1).finite(),
  // Sealed reserve: must at least cover the starting price to be sensible for the seller.
  reservePrice: z.number().min(1).finite(),
  originLabel: z.string().min(3).max(160).optional(),
  // Auction length in minutes; opens_at/closes_at are assigned server-side.
  durationMinutes: z.number().int().min(5).max(1440).default(60),
}).refine((data) => data.reservePrice >= data.startingPrice, {
  message: 'reservePrice must be greater than or equal to startingPrice',
  path: ['reservePrice'],
});
export type CreateAuctionLotInput = z.infer<typeof CreateAuctionLotSchema>;

export const PlaceBidSchema = z.object({
  amount: z.number().positive().finite(),
});
export type PlaceBidInput = z.infer<typeof PlaceBidSchema>;
