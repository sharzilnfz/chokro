import { NextResponse } from 'next/server';
import { db, listings, memoryStore } from '@chokro/db';
import { eq, and } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const condition = searchParams.get('condition');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let allItems: any[];

    try {
      if (category) {
        allItems = await db.select().from(listings).where(and(eq(listings.status, 'ACTIVE'), eq(listings.category, category))).limit(limit);
      } else {
        allItems = await db.select().from(listings).where(eq(listings.status, 'ACTIVE')).limit(limit);
      }
    } catch (dbErr) {
      allItems = memoryStore.listings.filter((l) => {
        if (l.status !== 'ACTIVE') return false;
        if (category && l.category !== category) return false;
        if (condition && l.declared_condition !== condition) return false;
        return true;
      }).slice(0, limit);
    }

    if (allItems.length === 0 && memoryStore.listings.length === 0) {
      // Mock seed fallback for feed if empty
      allItems = [
        {
          id: 'feed-1',
          owner_id: 'owner-1',
          category: 'PLASTICS',
          unit: 'kg',
          declared_weight: '10.0',
          declared_condition: 'GOOD',
          photos: ['https://example.com/plastic.jpg'],
          status: 'ACTIVE',
          created_at: new Date(),
        },
        {
          id: 'feed-2',
          owner_id: 'owner-2',
          category: 'BOOKS',
          unit: 'kg',
          declared_weight: '5.0',
          declared_condition: 'EXCELLENT',
          photos: ['https://example.com/books.jpg'],
          status: 'ACTIVE',
          created_at: new Date(),
        },
      ].filter((l) => !category || l.category === category);
    }

    return NextResponse.json({
      items: allItems,
      nextCursor: allItems.length > 0 ? allItems[allItems.length - 1].id : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
