// POST /api/admin/wallet/adjust — admin only. Manually credits or debits a user's wallet.
import { WalletAdjustSchema } from '@chokro/shared';
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute } from '@/lib/http';
import { WalletDomain } from '@/lib/domain/WalletDomain';

// Applies a manual wallet adjustment; a reason is mandatory for auditability.
export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const body = await req.json();
  const parsed = WalletAdjustSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid adjustment data. Reason is mandatory.', 400, parsed.error.format());
  }

  // Persist the adjustment and return the created transaction on success.
  try {
    const txn = await WalletDomain.createAdjustment(parsed.data);
    return apiSuccess('Wallet adjusted successfully', { txn }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Adjustment failed';
    return apiError(message, 400);
  }
});
