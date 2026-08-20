// GET /api/wallet/balance — auth required. Returns the caller's current wallet balance.
import { requireAuth } from '@/lib/auth';
import { apiData, safeRoute } from '@/lib/http';
import { walletService } from '@/lib/services/walletService';

// Returns the authenticated user's wallet balance.
export const GET = safeRoute(async (req: Request) => {
  // Resolve the caller from the request; short-circuit if unauthenticated.
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const balance = await walletService.getUserBalance(auth.user.userId);

  return apiData({ balance });
});
export { OPTIONS } from '@/lib/http';
