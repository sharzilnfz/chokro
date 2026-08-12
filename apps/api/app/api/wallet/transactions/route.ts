import { requireAuth } from '@/lib/auth';
import { apiData, safeRoute } from '@/lib/http';
import { WalletDomain } from '@/lib/domain/WalletDomain';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const transactions = await WalletDomain.getUserTransactions(auth.user.userId);
  return apiData({ transactions });
});
