import { z } from 'zod';
import { CategoryEnum, ConditionEnum, type Category, type Condition, type Unit } from '../enums';

export const RateCardSchema = z.object({
  category: CategoryEnum,
  conditionBand: ConditionEnum,
  priceBdt: z.number().positive(),
});
export type RateCardInput = z.infer<typeof RateCardSchema>;

export type Rate = {
  id: string;
  category: Category;
  condition_band: Condition;
  unit: Unit;
  price_bdt: string | number;
  effective_from: string;
};

export type RowRate = {
  category: string;
  entries: Rate[];
};

export type EstimateRate = {
  category: Category;
  condition: Condition;
  unit: Unit;
  price_bdt: string | number;
  effective_from?: string;
};
