import { PickupTransitionSchema } from '@chokro/shared';
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { PickupDomain } from '@/lib/domain/PickupDomain';
import { pickupRepo } from '@/lib/repos/pickups';

export const PATCH = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const { id } = await params;

  const parsed = PickupTransitionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError('Invalid pickup status', 400, parsed.error.format());
  }
  const targetStatus = parsed.data.status;

  const order = await pickupRepo.findById(id);
  if (!order) {
    return apiError('Pickup not found', 404);
  }

  const isCustomer = PickupDomain.isCustomer(order, auth.user.userId);
  const isCollector = await PickupDomain.isAssignedCollector(order, auth.user.userId);
  if (!isCustomer && !isCollector) {
    return apiError('Forbidden', 403);
  }

  // Customers may only cancel; the assigned collector drives the fulfilment states.
  if (targetStatus === 'CANCELLED' && !isCustomer) {
    return apiError('Only the customer can cancel a pickup', 403);
  }
  if (targetStatus !== 'CANCELLED' && !isCollector && order.collector_partner_id != null) {
    return apiError('Only the assigned collector can advance this pickup', 403);
  }
  // While no collector is assigned there is no privileged party yet: fall through to
  // transition validation so invalid advances surface as 409 rather than a role 403.
  // ASSIGNED is reachable only via dispatch at booking time, never via direct PATCH.
  if (targetStatus === 'ASSIGNED') {
    return apiError('Pickups are assigned via dispatch, not by status updates', 409);
  }

  if (!PickupDomain.canTransition(order.status, targetStatus)) {
    return apiError(`Invalid status transition from ${order.status} to ${targetStatus}`, 409);
  }

  const updated = await pickupRepo.updateStatus(id, targetStatus);
  return apiSuccess('Pickup updated', { pickup: updated });
});

export { OPTIONS } from '@/lib/http';
