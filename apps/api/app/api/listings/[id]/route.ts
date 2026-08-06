import { NextResponse } from 'next/server';
import { db, listings, memoryStore } from '@chokro/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '../../../../lib/auth';
import { databaseOrTestStore, routeError } from '../../../../lib/database';

const UpdateListingSchema = z.object({ status: z.enum(['DRAFT', 'ACTIVE', 'CANCELLED']) });
const transitions: Record<string, string[]> = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['CANCELLED'],
  CANCELLED: [],
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req);
    if (auth.response) return auth.response;
    const { id } = await params;
    const listing = await databaseOrTestStore(
      async () => (await db.select().from(listings).where(eq(listings.id, id)))[0],
      () => memoryStore.listings.find((item) => item.id === id),
    );

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.owner_id !== auth.user.userId && auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ listing });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req);
    if (auth.response) return auth.response;
    const { id } = await params;
    const parsed = UpdateListingSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid listing update' }, { status: 400 });
    }

    const existing = await databaseOrTestStore(
      async () => (await db.select().from(listings).where(eq(listings.id, id)))[0],
      () => memoryStore.listings.find((item) => item.id === id),
    );
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    if (existing.owner_id !== auth.user.userId && auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!transitions[existing.status]?.includes(parsed.data.status)) {
      return NextResponse.json({ error: 'Invalid listing status transition' }, { status: 400 });
    }

    const updatedListing = await databaseOrTestStore(
      async () => (await db.update(listings).set({ status: parsed.data.status }).where(eq(listings.id, id)).returning())[0],
      () => {
        existing.status = parsed.data.status;
        return existing;
      },
    );

    return NextResponse.json({ message: 'Listing updated', listing: updatedListing });
  } catch (error) {
    return routeError(error);
  }
}
