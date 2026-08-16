import { z } from 'zod';
import { CategoryEnum } from '../enums';

export const CreateZoneSchema = z.object({
  institutionId: z.string().min(1),
  name: z.string().min(1),
  acceptedCategories: z.array(CategoryEnum).min(1),
  geoLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
});
export type CreateZoneInput = z.infer<typeof CreateZoneSchema>;

export type DropZone = {
  id: string;
  name: string;
  status: string;
  acceptedCategories?: string[];
  institutionId?: string;
  geoLocation?: { lat: number; lng: number } | null;
};
