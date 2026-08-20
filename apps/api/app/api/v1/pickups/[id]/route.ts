import { requireAuth } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';
import { PickupDomain } from '@/lib/domain/PickupDomain';
import { pickupRepo } from '@/lib/repos/pickups';

export const GET = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const { id } = await params;

  const row = await pickupRepo.findByIdWithRefs(id);
  if (!row) {
    return apiError('Pickup not found', 404);
  }

  const isCustomer = PickupDomain.isCustomer(row.order, auth.user.userId);
  const isCollector = await PickupDomain.isAssignedCollector(row.order, auth.user.userId);
  if (!isCustomer && !isCollector) {
    return apiError('Forbidden', 403);
  }

  return apiData({ pickup: { ...row.order, listing: row.listing, collector: row.collector } });
});

export { OPTIONS } from '@/lib/http';
