import { requireAuth } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { listingService } from '@/lib/services/listingService';
import { CreateListingSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = CreateListingSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid listing data', 400, parsed.error.format());
  }

  const newListing = await listingService.createListing(auth.user.userId, parsed.data);

  return apiSuccess('Listing created', { listing: newListing }, 201);
});

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const myListings = await listingService.getListingsByOwner(auth.user.userId);
  return apiData({ listings: myListings });
});
