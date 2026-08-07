import { z } from 'zod';

export const WalletAdjustSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().finite().refine((amount) => amount !== 0),
  reason: z.string().min(5),
});
export type WalletAdjustInput = z.infer<typeof WalletAdjustSchema>;
