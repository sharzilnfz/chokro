import { z } from 'zod';
import { CategoryEnum, ConditionEnum } from '../enums';

export const RateCardSchema = z.object({
  category: CategoryEnum,
  conditionBand: ConditionEnum,
  priceBdt: z.number().positive(),
});
export type RateCardInput = z.infer<typeof RateCardSchema>;
