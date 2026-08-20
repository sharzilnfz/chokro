// DTOs for drop zone sessions, deposits, and scale emptying (SPEC 11)
import { z } from 'zod';
import { CategoryEnum } from '../enums';

export const CreateDropSessionSchema = z.object({
  qrToken: z.string().min(1),
  zoneId: z.string().uuid().optional(),
});

export type CreateDropSessionInput = z.infer<typeof CreateDropSessionSchema>;

export const RecordDepositSchema = z.object({
  sessionId: z.string().uuid(),
  category: CategoryEnum,
  declaredQuantity: z.number().positive().finite(),
  unit: z.enum(['kg', 'piece']),
  evidenceUrl: z.string().min(1),
});

export type RecordDepositInput = z.infer<typeof RecordDepositSchema>;

export const EmptyZoneSchema = z.object({
  scaleReadings: z.record(z.string(), z.number().min(0)),
  evidenceUrl: z.string().optional().nullable(),
});

export type EmptyZoneInput = z.infer<typeof EmptyZoneSchema>;
