// POST /api/admin/leaderboard/refresh — admin only. Materializes campus rankings.
import { requireAdmin } from '@/lib/auth';
import { apiSuccess, safeRoute } from '@/lib/http';
import { LeaderboardDomain } from '@/lib/domain/LeaderboardDomain';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const result = await LeaderboardDomain.materializeAll();
  return apiSuccess('Leaderboard materialized successfully', { result });
});
