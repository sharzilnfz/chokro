import { z } from 'zod';
import { CategoryEnum, ConditionEnum, PathEnum, UnitEnum } from '../enums';

export const ValuationScanInputSchema = z.object({
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  categoryHint: CategoryEnum.optional(),
  conditionHint: ConditionEnum.optional(),
  promptNotes: z.string().max(500).optional(),
  declaredQuantity: z.number().positive().optional(),
});
export type ValuationScanInput = z.infer<typeof ValuationScanInputSchema>;

export const BenchmarkSyncSchema = z.object({
  source: z.string().optional(),
  forceRefresh: z.boolean().optional(),
});
export type BenchmarkSyncInput = z.infer<typeof BenchmarkSyncSchema>;

export const EstimateQuerySchema = z.object({
  category: CategoryEnum,
  condition: ConditionEnum,
  weight: z.coerce.number().positive().optional(),
  pieceCount: z.coerce.number().int().positive().optional(),
});
export type EstimateQuery = z.infer<typeof EstimateQuerySchema>;
