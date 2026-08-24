// GET /api/badges/[awardId] — public. Returns verified badge award details.
import { apiData, apiError, safeRoute } from '@/lib/http';
import { BadgeDomain } from '@/lib/domain/BadgeDomain';

export const GET = safeRoute(async (_req: Request, context: { params: Promise<{ awardId: string }> | { awardId: string } }) => {
  const params = await context.params;
  const { awardId } = params;

  if (!awardId) {
    return apiError('Award ID is required', 400);
  }

  const badge = await BadgeDomain.getBadgeById(awardId);
  if (!badge) {
    return apiError('Badge award not found', 404);
  }

  return apiData({ badge });
});
export { OPTIONS } from '@/lib/http';
