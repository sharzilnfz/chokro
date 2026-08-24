// DTO for registering a physical drop-off collection zone.
import { z } from 'zod';
import { CategoryEnum } from '../enums';

// Validates a new collection point: institution, name, accepted categories, location, capacity, partner
export const CreateZoneSchema = z.object({
  institutionId: z.string().min(1),
  name: z.string().min(1),
  acceptedCategories: z.array(CategoryEnum).min(1),
  geoLocation: z.object({ lat: z.number(), lng: z.number() }).optional().nullable(),
  maxCapacityKg: z.number().positive().optional().nullable(),
  contractedPartnerId: z.string().uuid().optional().nullable(),
  status: z.string().optional(),
});
export type CreateZoneInput = z.infer<typeof CreateZoneSchema>;

// Validates drop zone capacity telemetry submission
export const ZoneTelemetrySchema = z.object({
  currentFillKg: z.number().min(0),
  triggerReason: z.string().optional(),
});
export type ZoneTelemetryInput = z.infer<typeof ZoneTelemetrySchema>;

