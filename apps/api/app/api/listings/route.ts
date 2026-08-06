import { NextResponse } from 'next/server';
import { db, listings, memoryStore } from '@chokro/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../../../lib/auth';
import { databaseOrTestStore, routeError } from '../../../lib/database';
import { CategoryEnum, ConditionEnum } from '@chokro/shared';
import { z } from 'zod';
import crypto from 'crypto';

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

export async function POST(req: Request) {
  try {
    const auth = requireAuth(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const parsed = CreateListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid listing data', details: parsed.error.format() }, { status: 400 });
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
    const newListing = await databaseOrTestStore(
      async () => (await db.insert(listings).values(values).returning())[0],
      () => {
        const listing = {
        id: crypto.randomUUID(),
        ...values,
        created_at: new Date(),
        };
        memoryStore.listings.push(listing);
        return listing;
      },
    );

    return NextResponse.json({ message: 'Listing created', listing: newListing }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req);
    if (auth.response) return auth.response;

    const myListings = await databaseOrTestStore(
      () => db.select().from(listings).where(eq(listings.owner_id, auth.user.userId)),
      () => memoryStore.listings.filter((item) => item.owner_id === auth.user.userId),
    );
    return NextResponse.json({ listings: myListings });
  } catch (error) {
    return routeError(error);
  }
}
