import { WalletAdjustSchema } from '@chokro/shared';
import { requireAdmin } from '../../../../../lib/auth';
import { apiError, apiSuccess, safeRoute } from '../../../../../lib/http';
import { walletRepo } from '../../../../../lib/repos/wallet';



export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const body = await req.json();
  const parsed = WalletAdjustSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid adjustment data. Reason is mandatory.', 400, parsed.error.format());
  }

  const txn = await walletRepo.createAdjustmentTransaction(parsed.data);

  return apiSuccess('Wallet adjusted successfully', { txn }, 201);
});

