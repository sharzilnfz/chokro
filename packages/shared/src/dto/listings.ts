import { z } from 'zod';
import { CategoryEnum, ConditionEnum } from '../enums';

export const CreateListingSchema = z.object({
  category: CategoryEnum,
  unit: z.enum(['kg', 'piece']),
  declaredWeight: z.number().positive().finite().optional(),
  pieceCount: z.number().int().positive().optional(),
  declaredCondition: ConditionEnum,
  photos: z.array(z.string()).default([]),
  status: z.enum(['DRAFT', 'ACTIVE']).default('ACTIVE'),
}).superRefine((listing, context) => {
  const isPieceCategory = listing.category === 'APPLIANCES' || listing.category === 'E_WASTE';
  if (isPieceCategory && (listing.unit !== 'piece' || listing.pieceCount === undefined || listing.declaredWeight !== undefined)) {
    context.addIssue({ code: 'custom', message: 'Appliances and e-waste require piece unit and pieceCount' });
  }
  if (!isPieceCategory && (listing.unit !== 'kg' || listing.declaredWeight === undefined || listing.pieceCount !== undefined)) {
    context.addIssue({ code: 'custom', message: 'This category requires kg unit and declaredWeight' });
  }
});
export type CreateListingInput = z.infer<typeof CreateListingSchema>;

export const UpdateListingSchema = z.object({ status: z.enum(['DRAFT', 'ACTIVE', 'CANCELLED']) });
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;
