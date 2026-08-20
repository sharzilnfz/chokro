import { z } from 'zod';

export const DisputeSourceTypeEnum = z.enum(['PICKUP', 'DEPOSIT', 'AUCTION_LOT']);
export type DisputeSourceType = z.infer<typeof DisputeSourceTypeEnum>;

export const DisputeStatusEnum = z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED']);
export type DisputeStatus = z.infer<typeof DisputeStatusEnum>;

export const DisputeResolutionEnum = z.enum([
  'BUYER_FAVORED',
  'SELLER_FAVORED',
  'PARTIAL_RELEASE',
  'SPLIT',
  'UPHELD',
  'DISMISSED',
]);
export type DisputeResolution = z.infer<typeof DisputeResolutionEnum>;

export const CreateDisputeSchema = z.object({
  sourceType: DisputeSourceTypeEnum,
  sourceId: z.string().uuid(),
  againstUserId: z.string().uuid(),
  reason: z.string().min(5).max(3000),
  evidenceUrls: z.array(z.string()).default([]),
});
export type CreateDisputeInput = z.infer<typeof CreateDisputeSchema>;

export const ResolveDisputeSchema = z.object({
  resolution: DisputeResolutionEnum,
  resolutionNotes: z.string().min(3).max(3000),
  buyerAmountBdt: z.number().nonnegative().optional(),
  sellerAmountBdt: z.number().nonnegative().optional(),
});
export type ResolveDisputeInput = z.infer<typeof ResolveDisputeSchema>;

export interface DisputeDto {
  id: string;
  source_type: DisputeSourceType;
  source_id: string;
  opened_by: string;
  against_user_id: string;
  reason: string;
  evidence_urls: string[];
  status: DisputeStatus;
  resolution: string | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  source_summary?: string | null;
}
