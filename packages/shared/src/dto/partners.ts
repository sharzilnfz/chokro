import { z } from 'zod';

export const VerifyPartnerSchema = z.object({
  partnerId: z.string(),
  status: z.enum(['VERIFIED', 'REJECTED']),
});
export type VerifyPartnerInput = z.infer<typeof VerifyPartnerSchema>;

export const PartnerApplySchema = z.object({
  orgName: z.string().min(2),
  types: z.array(z.string()).min(1),
  eWasteLicensed: z.boolean().default(false),
  doeLicenseDoc: z.string().nullable().optional(),
});
export type PartnerApplyInput = z.infer<typeof PartnerApplySchema>;
