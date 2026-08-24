// DTOs for partner onboarding, verification flow, and capability management.
import { z } from 'zod';
import { PartnerTypeEnum, KycDocumentTypeEnum, KycAdjudicationDecisionEnum } from '../enums';

// Validates granular capability flags for a partner organization
export const PartnerCapabilityFlagsSchema = z.object({
  collects: z.boolean().optional(),
  repairs: z.boolean().optional(),
  buys: z.boolean().optional(),
  accepts_donations: z.boolean().optional(),
}).catchall(z.boolean());
export type PartnerCapabilityFlags = z.infer<typeof PartnerCapabilityFlagsSchema>;

// Validates an admin's approve/reject decision on a partner application
export const VerifyPartnerSchema = z.object({
  partnerId: z.string(),
  status: z.enum(['VERIFIED', 'REJECTED']),
  reason: z.string().min(3).optional(), // Admin rejection reason or verification note
});
export type VerifyPartnerInput = z.infer<typeof VerifyPartnerSchema>;

// Validates a partner's onboarding request (org details, typed classifications + e-waste doc)
export const PartnerApplySchema = z.object({
  orgName: z.string().min(2),
  types: z.array(PartnerTypeEnum).min(1),
  eWasteLicensed: z.boolean().default(false),
  doeLicenseDoc: z.string().nullable().optional(),
  capabilityFlags: PartnerCapabilityFlagsSchema.optional(),
});
export type PartnerApplyInput = z.infer<typeof PartnerApplySchema>;

// Validates admin updates to a partner organization's operational capability flags
export const UpdatePartnerCapabilitiesSchema = z.object({
  partnerId: z.string(),
  capabilityFlags: PartnerCapabilityFlagsSchema,
});
export type UpdatePartnerCapabilitiesInput = z.infer<typeof UpdatePartnerCapabilitiesSchema>;

// Validates a KYC document OCR extraction request (SPEC 15)
export const KycExtractRequestSchema = z.object({
  partnerId: z.string().uuid(),
  documentUrl: z.string().min(1),
  documentType: KycDocumentTypeEnum.default('TRADE_LICENSE'),
  submittedLicenseNumber: z.string().optional().nullable(),
  submittedOrgName: z.string().optional().nullable(),
  rawDocumentText: z.string().optional().nullable(),
  imageBase64: z.string().optional().nullable(),
});
export type KycExtractRequestInput = z.infer<typeof KycExtractRequestSchema>;

// Validates an admin KYC adjudication decision (SPEC 15)
export const KycAdjudicateRequestSchema = z.object({
  decision: KycAdjudicationDecisionEnum,
  notes: z.string().optional().nullable(),
  grantEwasteLicense: z.boolean().optional().default(false),
});
export type KycAdjudicateRequestInput = z.infer<typeof KycAdjudicateRequestSchema>;

