// GET /api/leaderboard — public / optional auth. Returns period campus rankings.
import { verifyAuthHeader } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';
import { LeaderboardDomain } from '@/lib/domain/LeaderboardDomain';
import { LeaderboardQuerySchema } from '@chokro/shared';

export const GET = safeRoute(async (req: Request) => {
  const url = new URL(req.url);
  const periodParam = url.searchParams.get('period') || 'WEEKLY';

  const parsed = LeaderboardQuerySchema.safeParse({ period: periodParam });
  if (!parsed.success) {
    return apiError('Invalid leaderboard period. Allowed: WEEKLY, MONTHLY, ALL_TIME', 400);
  }

  const authUser = verifyAuthHeader(req);
  const rankings = await LeaderboardDomain.getRankings(parsed.data.period, authUser?.userId);

  return apiData(rankings);
});
