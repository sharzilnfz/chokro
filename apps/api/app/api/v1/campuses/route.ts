// GET /api/campuses — auth required. Lists all registered university campuses.
import { requireAuth } from '@/lib/auth';
import { apiData, safeRoute } from '@/lib/http';
import { CampusDomain } from '@/lib/domain/CampusDomain';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const campuses = await CampusDomain.list();
  return apiData({ campuses });
});
export { OPTIONS } from '@/lib/http';
