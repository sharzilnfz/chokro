// GET /api/demands/matches — auth required. Lists matches for caller's demands.
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { DemandBoardDomain } from '@/lib/domain/DemandBoardDomain';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const demandId = searchParams.get('demandId') || undefined;
  const status = searchParams.get('status') || undefined;

  const matches = await DemandBoardDomain.getMatchesForBuyer(auth.user.userId, demandId, status);
  return apiData({ matches });
});

export const PATCH = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const { matchId, status } = body;
  if (!matchId || !status) {
    return apiError('Missing matchId or status', 400);
  }

  const updated = await DemandBoardDomain.updateMatchStatus(matchId, status);
  if (!updated) {
    return apiError('Match not found', 404);
  }

  return apiSuccess('Match updated', { match: updated });
});
