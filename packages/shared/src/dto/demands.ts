// DTOs for recycler standing demands and demand matches (SPEC 17)
import { z } from 'zod';
import { CategoryEnum } from '../enums';

export const CreateDemandSchema = z.object({
  category: CategoryEnum,
  minQuantity: z.number().positive().finite(),
  maxQuantity: z.number().positive().finite().optional().nullable(),
  unit: z.enum(['kg', 'piece']),
  maxPricePerUnitBdt: z.number().positive().finite(),
  targetThana: z.string().max(120).optional().nullable(),
  targetLat: z.number().finite().optional().nullable(),
  targetLng: z.number().finite().optional().nullable(),
  maxRadiusKm: z.number().int().min(1).max(100).default(10),
  durationDays: z.number().int().min(1).max(90).default(30),
});

export type CreateDemandInput = z.infer<typeof CreateDemandSchema>;

export const UpdateDemandStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'FULFILLED', 'EXPIRED']),
});

export type UpdateDemandStatusInput = z.infer<typeof UpdateDemandStatusSchema>;

export const DemandMatchQuerySchema = z.object({
  demandId: z.string().uuid().optional(),
  status: z.enum(['UNNOTICED', 'VIEWED', 'OFFERED', 'DECLINED']).optional(),
});

export type DemandMatchQueryInput = z.infer<typeof DemandMatchQuerySchema>;
