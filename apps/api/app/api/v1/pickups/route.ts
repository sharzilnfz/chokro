import { CreatePickupSchema } from '@chokro/shared';
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { listingRepo } from '@/lib/repos/listings';
import { partnerRepo } from '@/lib/repos/partners';
import { pickupRepo } from '@/lib/repos/pickups';
import { PickupDomain } from '@/lib/domain/PickupDomain';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const parsed = CreatePickupSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError('Invalid pickup request', 400, parsed.error.format());
  }

  const listing = await listingRepo.findById(parsed.data.listingId);
  if (!listing) {
    return apiError('Listing not found', 404);
  }
  if (listing.owner_id !== auth.user.userId) {
    return apiError('Forbidden', 403);
  }
  if (listing.status !== 'ACTIVE') {
    return apiError('Only ACTIVE listings can be booked for pickup', 400);
  }

  const result = await PickupDomain.assignBestCollector({
    listing,
    customerId: auth.user.userId,
    address: parsed.data.address,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    scheduledFor: new Date(parsed.data.scheduledFor),
    notes: parsed.data.notes ?? null,
  });

  return apiSuccess('Pickup booked', {
    pickup: result.order,
    collector: result.collector,
    assignment_status: result.assignmentStatus,
    eligibility: result.runnersUp,
  }, 201);
});

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const pickups = await pickupRepo.findByCustomer(auth.user.userId);

  const partner = await partnerRepo.findByUserId(auth.user.userId);
  const isCollector = partner != null && Array.isArray(partner.types) && partner.types.includes('COLLECTOR');
  const collectorPickups = isCollector && partner
    ? await pickupRepo.findByCollector(partner.id)
    : [];

  return apiData({
    pickups: pickups.map((row) => ({ ...row.order, listing: row.listing, collector: row.collector })),
    collectorPickups: collectorPickups.map((row) => ({ ...row.order, listing: row.listing, collector: row.collector })),
  });
});

export { OPTIONS } from '@/lib/http';
