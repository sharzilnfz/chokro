import { NextResponse } from 'next/server';
import { listingRepo } from '../../../../lib/repos/listings';
import { z } from 'zod';
import { requireAuth } from '../../../../lib/auth';
import { apiError, safeRoute } from '../../../../lib/http';

const UpdateListingSchema = z.object({ status: z.enum(['DRAFT', 'ACTIVE', 'CANCELLED']) });
const transitions: Record<string, string[]> = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['CANCELLED'],
  CANCELLED: [],
};

export const GET = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  const listing = await listingRepo.findById(id);

  if (!listing) {
    return apiError('Listing not found', 404);
  }

  if (listing.owner_id !== auth.user.userId && auth.user.role !== 'ADMIN') {
    return apiError('Forbidden', 403);
  }

  return NextResponse.json({ listing });
});

export const PATCH = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  const parsed = UpdateListingSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError('Invalid listing update', 400);
  }

  const existing = await listingRepo.findById(id);
  if (!existing) {
    return apiError('Listing not found', 404);
  }
  if (existing.owner_id !== auth.user.userId && auth.user.role !== 'ADMIN') {
    return apiError('Forbidden', 403);
  }
  if (!transitions[existing.status]?.includes(parsed.data.status)) {
    return apiError('Invalid listing status transition', 400);
  }

  const updatedListing = await listingRepo.updateStatus(id, parsed.data.status);

  return NextResponse.json({ message: 'Listing updated', listing: updatedListing });
});
