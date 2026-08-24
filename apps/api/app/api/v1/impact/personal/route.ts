// GET /api/v1/impact/personal — auth required. Returns individual verified impact summary (M16)
import { requireAuth } from '@/lib/auth';
import { apiData, safeRoute } from '@/lib/http';
import { ImpactDomain } from '@/lib/domain/ImpactDomain';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const summary = await ImpactDomain.getPersonalImpact(auth.user.userId);
  return apiData({ impact: summary, ...summary });
});

export { OPTIONS } from '@/lib/http';
