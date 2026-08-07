import { requireAuth } from '@/lib/auth';
import { apiData, safeRoute } from '@/lib/http';
import { walletService } from '@/lib/services/walletService';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const balance = await walletService.getUserBalance(auth.user.userId);

  return apiData({ balance });
});
