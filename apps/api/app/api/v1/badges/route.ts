// GET /api/badges — auth required. Returns all badges earned by caller with metadata.
import { requireAuth } from '@/lib/auth';
import { apiData, safeRoute } from '@/lib/http';
import { BadgeDomain } from '@/lib/domain/BadgeDomain';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const badges = await BadgeDomain.getUserBadges(auth.user.userId);
  return apiData({ badges });
});
export { OPTIONS } from '@/lib/http';
