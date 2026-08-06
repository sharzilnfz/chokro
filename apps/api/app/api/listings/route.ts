import { NextResponse } from 'next/server';
import { db, listings, memoryStore } from '@chokro/db';
import { verifyAuthHeader } from '../../../lib/auth';
import { z } from 'zod';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';

const CreateListingSchema = z.object({
  category: z.enum([
    'CLOTHES',
    'BOOKS',
    'PLASTICS',
    'PAPER',
    'METAL',
    'GLASS',
    'FURNITURE',
    'APPLIANCES',
    'E_WASTE',
  ]),
  unit: z.enum(['kg', 'piece']),
  declaredWeight: z.number().optional(),
  declaredCondition: z.string(),
  photos: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  try {
    const payload = verifyAuthHeader(req);
    const userIdHeader = req.headers.get('x-user-id');
    const ownerId = payload?.userId || userIdHeader || '11111111-1111-1111-1111-111111111111';

    const body = await req.json();
    const parsed = CreateListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid listing data', details: parsed.error.format() }, { status: 400 });
    }

    const { category, unit, declaredWeight, declaredCondition, photos } = parsed.data;

    let newListing: any;

    try {
      [newListing] = await db
        .insert(listings)
        .values({
          owner_id: ownerId,
          category,
          unit,
          declared_weight: declaredWeight ? declaredWeight.toString() : null,
          declared_condition: declaredCondition,
          photos,
          status: 'ACTIVE',
        })
        .returning();
    } catch (dbErr) {
      newListing = {
        id: crypto.randomUUID(),
        owner_id: ownerId,
        category,
        unit,
        declared_weight: declaredWeight ? declaredWeight.toString() : null,
        declared_condition: declaredCondition,
        photos,
        status: 'ACTIVE',
        created_at: new Date(),
      };
      memoryStore.listings.push(newListing);
    }

    return NextResponse.json({ message: 'Listing created', listing: newListing }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    let allListings: any[];
    try {
      allListings = await db.select().from(listings);
    } catch (dbErr) {
      allListings = memoryStore.listings;
    }
    return NextResponse.json({ listings: allListings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
