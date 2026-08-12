import { AuthDomain } from '@/lib/domain/AuthDomain';
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const user = await AuthDomain.getUserProfile(auth.user.userId);
  if (!user) {
    return apiError('Unauthorized', 401);
  }

  return apiData({ user });
});
