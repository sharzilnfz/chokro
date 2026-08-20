import { z } from 'zod';

export const MediaPurposeEnum = z.enum(['LISTING', 'DEPOSIT_EVIDENCE', 'DISPUTE_PROOF']);
export type MediaPurpose = z.infer<typeof MediaPurposeEnum>;

export const MediaUploadResponseSchema = z.object({
  mediaId: z.string(),
  publicUrl: z.string(),
  thumbnailUrl: z.string(),
  isPrivacyStripped: z.boolean(),
  byteSize: z.number(),
  degradedMode: z.boolean(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  exifGpsExtracted: z.boolean(),
  extractedLat: z.number().optional().nullable(),
  extractedLng: z.number().optional().nullable(),
});
export type MediaUploadResponse = z.infer<typeof MediaUploadResponseSchema>;
