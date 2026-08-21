import { requireAuth } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';
import { partnerRepo } from '@/lib/repos/partners';
import { PickupDomain } from '@/lib/domain/PickupDomain';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const partner = await partnerRepo.findByUserId(auth.user.userId);
  if (!partner || !Array.isArray(partner.types) || !partner.types.includes('COLLECTOR')) {
    return apiError('Forbidden', 403);
  }

  const route = await PickupDomain.optimizeRoute(partner.id);
  return apiData({
    partner,
    routing_source: route.routing_source,
    base: route.base,
    stops: route.stops,
  });
});

export { OPTIONS } from '@/lib/http';
