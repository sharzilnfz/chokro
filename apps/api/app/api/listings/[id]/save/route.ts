import { requireAuth } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';
import { savedListingRepo } from '@/lib/repos/savedListings';
import { listingRepo } from '@/lib/repos/listings';

export const POST = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const { id } = await params;

  const listing = await listingRepo.findById(id);
  if (!listing) {
    return apiError('Listing not found', 404);
  }

  await savedListingRepo.save(auth.user.userId, id);
  return apiData({ listingId: id, saved: true });
});

export const DELETE = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const { id } = await params;

  await savedListingRepo.unsave(auth.user.userId, id);
  return apiData({ listingId: id, saved: false });
});