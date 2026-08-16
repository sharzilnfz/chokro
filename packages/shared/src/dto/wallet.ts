import { z } from 'zod';
import type { CreditTxnKind, CreditTxnStatus } from '../enums';

export const WalletAdjustSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().finite().refine((amount) => amount !== 0),
  reason: z.string().min(5),
});
export type WalletAdjustInput = z.infer<typeof WalletAdjustSchema>;

export type Balance = {
  verified: number;
  pending: number;
};

export type CreditTransaction = {
  id: string;
  amount: string | number;
  kind: CreditTxnKind;
  status: CreditTxnStatus;
  reason?: string | null;
  source_id?: string | null;
  created_at?: string;
};

export type WalletData = {
  balance: Balance;
  transactions: CreditTransaction[];
};
