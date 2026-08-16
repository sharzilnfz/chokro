// GET /api/wallet/transactions — auth required. Returns the caller's wallet transaction history.
import { requireAuth } from '@/lib/auth';
import { apiData, safeRoute } from '@/lib/http';
import { WalletDomain } from '@/lib/domain/WalletDomain';

// Returns the authenticated user's transaction history.
export const GET = safeRoute(async (req: Request) => {
  // Gate on the caller's session before issuing any domain work.
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  // Fetch the caller's ledger, keyed by their user id, and return it as-is.
  const transactions = await WalletDomain.getUserTransactions(auth.user.userId);
  return apiData({ transactions });
});
