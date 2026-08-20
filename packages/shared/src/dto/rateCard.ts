// DTO for creating price entries on the rate card.
import { z } from 'zod';
import { CategoryEnum, ConditionEnum } from '../enums';

// Validates a price rule keyed by category + condition band, priced in BDT
export const RateCardSchema = z.object({
  category: CategoryEnum,
  conditionBand: ConditionEnum,
  priceBdt: z.number().positive(),
});
export type RateCardInput = z.infer<typeof RateCardSchema>;
