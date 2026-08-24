import { z } from 'zod';

export const EscrowStatusEnum = z.enum([
  'HELD',
  'RELEASED_TO_SELLER',
  'RETURNED_TO_BUYER',
  'PARTIALLY_RELEASED',
  'FROZEN_IN_DISPUTE',
]);
export type EscrowStatus = z.infer<typeof EscrowStatusEnum>;

export const ReleaseEscrowSchema = z.object({
  notes: z.string().max(1000).optional(),
});
export type ReleaseEscrowInput = z.infer<typeof ReleaseEscrowSchema>;

export interface EscrowHoldDto {
  id: string;
  lot_id: string;
  buyer_id: string;
  seller_id: string;
  amount_bdt: number;
  status: EscrowStatus;
  inspection_expires_at: string;
  created_at: string;
}
