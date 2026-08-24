// DTOs for bilateral counter-offer negotiations (Ticket 06 / SPEC 18)
import { z } from 'zod';
import { UnitEnum, NegotiationThreadStatusEnum, NegotiationOfferStatusEnum } from '../enums';

export const CreateNegotiationThreadSchema = z.object({
  listingId: z.string().uuid(),
  initialOfferAmountBdt: z.number().positive().finite(),
  offeredQuantity: z.number().positive().finite(),
  unit: UnitEnum.optional(),
  proposedPickupAt: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
export type CreateNegotiationThreadInput = z.infer<typeof CreateNegotiationThreadSchema>;

export const CreateCounterOfferSchema = z.object({
  offerAmountBdt: z.number().positive().finite(),
  offeredQuantity: z.number().positive().finite(),
  unit: UnitEnum.optional(),
  proposedPickupAt: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
export type CreateCounterOfferInput = z.infer<typeof CreateCounterOfferSchema>;

export const RejectOfferSchema = z.object({
  reason: z.string().max(1000).optional().nullable(),
});
export type RejectOfferInput = z.infer<typeof RejectOfferSchema>;

export const AcceptOfferSchema = z.object({
  notes: z.string().max(1000).optional().nullable(),
}).optional();
export type AcceptOfferInput = z.infer<typeof AcceptOfferSchema>;

export interface NegotiationOfferDto {
  id: string;
  thread_id: string;
  offered_by_user_id: string;
  offer_amount_bdt: string;
  offered_quantity: string;
  unit: string;
  proposed_pickup_at: string | null;
  notes: string | null;
  status: z.infer<typeof NegotiationOfferStatusEnum>;
  expires_at: string;
  created_at: string;
}

export interface NegotiationThreadDto {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: z.infer<typeof NegotiationThreadStatusEnum>;
  last_offer_id: string | null;
  created_at: string;
  updated_at: string;
  active_offer?: NegotiationOfferDto | null;
  offers?: NegotiationOfferDto[];
  listing?: {
    id: string;
    category: string;
    unit: string;
    declared_weight?: string | null;
    piece_count?: number | null;
    declared_condition: string;
    price_bdt: string;
    status: string;
    photos: string[];
    thana?: string | null;
    zilla?: string | null;
  };
  buyer?: {
    id: string;
    email: string;
    full_name?: string | null;
  };
  seller?: {
    id: string;
    email: string;
    full_name?: string | null;
  };
}
