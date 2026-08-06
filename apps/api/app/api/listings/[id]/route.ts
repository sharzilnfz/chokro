import { NextResponse } from 'next/server';
import { db, listings, memoryStore } from '@chokro/db';
import { eq } from 'drizzle-orm';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let listing: any;

  try {
    [listing] = await db.select().from(listings).where(eq(listings.id, id));
  } catch (dbErr) {
    listing = memoryStore.listings.find((l) => l.id === id);
  }

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  return NextResponse.json({ listing });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json();

  let updatedListing: any;

  try {
    [updatedListing] = await db
      .update(listings)
      .set({
        ...(body.status && { status: body.status }),
      })
      .where(eq(listings.id, id))
      .returning();
  } catch (dbErr) {
    const item = memoryStore.listings.find((l) => l.id === id);
    if (item) {
      if (body.status) item.status = body.status;
      updatedListing = item;
    }
  }

  if (!updatedListing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Listing updated', listing: updatedListing });
}
