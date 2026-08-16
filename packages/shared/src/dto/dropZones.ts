// DTO for registering a physical drop-off collection zone.
import { z } from 'zod';
import { CategoryEnum } from '../enums';

// Validates a new collection point: institution, name, accepted categories, location
export const CreateZoneSchema = z.object({
  institutionId: z.string().min(1),
  name: z.string().min(1),
  acceptedCategories: z.array(CategoryEnum).min(1),
  geoLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
});
export type CreateZoneInput = z.infer<typeof CreateZoneSchema>;
