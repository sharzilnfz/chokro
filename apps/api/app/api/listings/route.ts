import { NextResponse } from 'next/server';
import { listingRepo } from '../../../lib/repos/listings';
import { requireAuth } from '../../../lib/auth';
import { apiError, safeRoute } from '../../../lib/http';
import { CategoryEnum, ConditionEnum } from '@chokro/shared';
import { z } from 'zod';

const CreateListingSchema = z.object({
  category: CategoryEnum,
  unit: z.enum(['kg', 'piece']),
  declaredWeight: z.number().positive().finite().optional(),
  pieceCount: z.number().int().positive().optional(),
  declaredCondition: ConditionEnum,
  photos: z.array(z.string()).default([]),
  status: z.enum(['DRAFT', 'ACTIVE']).default('ACTIVE'),
}).superRefine((listing, context) => {
  const isPieceCategory = listing.category === 'APPLIANCES' || listing.category === 'E_WASTE';
  if (isPieceCategory && (listing.unit !== 'piece' || listing.pieceCount === undefined || listing.declaredWeight !== undefined)) {
    context.addIssue({ code: 'custom', message: 'Appliances and e-waste require piece unit and pieceCount' });
  }
  if (!isPieceCategory && (listing.unit !== 'kg' || listing.declaredWeight === undefined || listing.pieceCount !== undefined)) {
    context.addIssue({ code: 'custom', message: 'This category requires kg unit and declaredWeight' });
  }
});

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = CreateListingSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid listing data', 400, parsed.error.format());
  }

  const { category, unit, declaredWeight, pieceCount, declaredCondition, photos, status } = parsed.data;
  const values = {
    owner_id: auth.user.userId,
    category,
    unit,
    declared_weight: declaredWeight?.toString() ?? null,
    piece_count: pieceCount ?? null,
    declared_condition: declaredCondition,
    photos,
    status,
  };
  const newListing = await listingRepo.create(values);

  return NextResponse.json({ message: 'Listing created', listing: newListing }, { status: 201 });
});

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const myListings = await listingRepo.findByOwnerId(auth.user.userId);
  return NextResponse.json({ listings: myListings });
});
