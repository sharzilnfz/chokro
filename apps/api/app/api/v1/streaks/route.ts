// GET /api/streaks — auth required. Returns the caller's current streak and multiplier.
import { requireAuth } from '@/lib/auth';
import { apiData, safeRoute } from '@/lib/http';
import { StreakDomain } from '@/lib/domain/StreakDomain';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const streak = await StreakDomain.getStreak(auth.user.userId);
  return apiData({ streak });
});
export { OPTIONS } from '@/lib/http';
