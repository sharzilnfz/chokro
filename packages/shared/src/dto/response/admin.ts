// Response DTOs for the admin console: the envelopes adminApiRequest unwraps plus row shapes.
import { z } from 'zod';
import { CampusSchema } from '../campuses';
import { CategoryEnum, ConditionEnum, UnitEnum } from '../../enums';

// One rate-card history row as returned by GET/POST /api/admin/rate-card
// (a raw rate_card_entries row: decimal price as string, ISO timestamp).
export const RateCardRowSchema = z.object({
  id: z.string(),
  category: CategoryEnum,
  condition_band: ConditionEnum,
  unit: UnitEnum,
  price_bdt: z.string(),
  effective_from: z.string(),
  updated_by: z.string().nullable(),
});
export type RateCardRow = z.infer<typeof RateCardRowSchema>;

// Envelopes for the rate-card endpoints (entries may be omitted → callers default to []).
export const RateCardListResponseSchema = z.object({
  entries: z.array(RateCardRowSchema).optional(),
});
export const RateCardEntryResponseSchema = z.object({
  message: z.string().optional(),
  entry: RateCardRowSchema.optional(),
});

// Envelopes for the campus endpoints (reuse the canonical CampusSchema row).
export const CampusListResponseSchema = z.object({
  campuses: z.array(CampusSchema).optional(),
});
export const CampusMutationResponseSchema = z.object({
  message: z.string().optional(),
  campus: CampusSchema.optional(),
});
