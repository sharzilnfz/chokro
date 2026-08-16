import { z } from 'zod';

export const PickupStatusEnum = z.enum(['REQUESTED', 'ASSIGNED', 'EN_ROUTE', 'COLLECTED', 'CANCELLED']);
export type PickupStatus = z.infer<typeof PickupStatusEnum>;

export const PICKUP_STATUSES = PickupStatusEnum.options;

export const CreatePickupSchema = z.object({
  listingId: z.string().uuid(),
  address: z.string().min(5),
  lat: z.number().min(-90).max(90).finite(),
  lng: z.number().min(-180).max(180).finite(),
  scheduledFor: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'scheduledFor must be an ISO datetime string',
  }),
  notes: z.string().max(500).optional(),
});
export type CreatePickupInput = z.infer<typeof CreatePickupSchema>;

export const PickupTransitionSchema = z.object({
  status: PickupStatusEnum,
});
export type PickupTransitionInput = z.infer<typeof PickupTransitionSchema>;
