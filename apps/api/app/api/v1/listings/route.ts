// POST /api/listings — auth required. Creates a listing owned by the caller.
// GET /api/listings — auth required. Lists the caller's own listings.
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { ListingDomain } from '@/lib/domain/ListingDomain';
import { CreateListingSchema } from '@chokro/shared';

// Creates a new listing, bound to the caller as its owner.
export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = CreateListingSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid listing data', 400, parsed.error.format());
  }

  const newListing = await ListingDomain.createListing(auth.user.userId, parsed.data);

  return apiSuccess('Listing created', { listing: newListing }, 201);
});

// Returns the caller's listings, scoped to their ownership.
export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const myListings = await ListingDomain.getListingsByOwner(auth.user.userId);
  return apiData({ listings: myListings });
});
export { OPTIONS } from '@/lib/http';
