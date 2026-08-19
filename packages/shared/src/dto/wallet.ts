// DTO for treasury/admin adjustments to a user's credit wallet.
import { z } from 'zod';

// Validates a manual credit adjustment: target user, non-zero amount, and reason
export const WalletAdjustSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().finite().refine((amount) => amount !== 0),
  reason: z.string().min(5),
});
export type WalletAdjustInput = z.infer<typeof WalletAdjustSchema>;
