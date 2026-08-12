import { UpdateListingSchema } from '@chokro/shared';
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { listingService } from '@/lib/services/listingService';

export const GET = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  const listing = await listingService.getListingById(id);

  if (!listing) {
    return apiError('Listing not found', 404);
  }

  if (!listingService.isOwnerOrAdmin(listing, auth.user.userId, auth.user.role)) {
    return apiError('Forbidden', 403);
  }

  return apiData({ listing });
});

export const PATCH = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  const parsed = UpdateListingSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError('Invalid listing update', 400);
  }

  const existing = await listingService.getListingById(id);
  if (!existing) {
    return apiError('Listing not found', 404);
  }
  if (!listingService.isOwnerOrAdmin(existing, auth.user.userId, auth.user.role)) {
    return apiError('Forbidden', 403);
  }
  if (!listingService.isValidTransition(existing.status, parsed.data.status)) {
    return apiError('Invalid listing status transition', 400);
  }

  const updatedListing = await listingService.updateListingStatus(id, parsed.data.status, existing.status);

  return apiSuccess('Listing updated', { listing: updatedListing });
});
