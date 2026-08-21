// GET /api/listings/{id} — auth required, owner-or-admin. Fetches a single listing.
// PATCH /api/listings/{id} — auth required, owner-or-admin. Transitions a listing's status.
import { UpdateListingSchema } from '@chokro/shared';
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { ListingDomain } from '@/lib/domain/ListingDomain';

// Returns a single listing, but only to its owner or an admin.
export const GET = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  const listing = await ListingDomain.getListingById(id);

  if (!listing) {
    return apiError('Listing not found', 404);
  }

  if (!ListingDomain.isOwnerOrAdmin(listing, auth.user.userId, auth.user.role)) {
    return apiError('Forbidden', 403);
  }

  return apiData({ listing });
});

// Updates a listing's status, enforcing ownership and valid state transitions.
export const PATCH = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  const parsed = UpdateListingSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError('Invalid listing update', 400);
  }

  // Validate existence, ownership, and a legal transition before mutating state.
  const existing = await ListingDomain.getListingById(id);
  if (!existing) {
    return apiError('Listing not found', 404);
  }
  if (!ListingDomain.isOwnerOrAdmin(existing, auth.user.userId, auth.user.role)) {
    return apiError('Forbidden', 403);
  }
  if (!ListingDomain.isValidTransition(existing.status, parsed.data.status)) {
    return apiError('Invalid listing status transition', 400);
  }

  const updatedListing = await ListingDomain.updateListingStatus(id, parsed.data.status, existing.status);

  return apiSuccess('Listing updated', { listing: updatedListing });
});
export { OPTIONS } from '@/lib/http';
