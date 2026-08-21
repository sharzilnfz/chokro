// Response DTOs for wallet reads: the verified/pending split and one ledger row.
import { z } from 'zod';
import { CreditTxnKindEnum, CreditTxnStatusEnum } from '../../enums';

// Verified vs pending credit totals as returned by GET /api/wallet/balance.
export const BalanceSummarySchema = z.object({
  verified: z.number(),
  pending: z.number(),
});
export type BalanceSummary = z.infer<typeof BalanceSummarySchema>;

// One credit-ledger row as returned by GET /api/wallet/transactions
// (decimal amounts serialize as strings, timestamps as ISO strings).
export const CreditTransactionDtoSchema = z.object({
  id: z.string(),
  amount: z.string(),
  kind: CreditTxnKindEnum,
  status: CreditTxnStatusEnum,
  source_id: z.string().nullable(),
  reason: z.string().nullable(),
  created_at: z.string(),
});
export type CreditTransactionDto = z.infer<typeof CreditTransactionDtoSchema>;
