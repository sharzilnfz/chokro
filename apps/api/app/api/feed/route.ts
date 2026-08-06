import { NextResponse } from 'next/server';
import { db, listings, memoryStore } from '@chokro/db';
import { and, desc, eq, lt, or } from 'drizzle-orm';
import { CategoryEnum, ConditionEnum } from '@chokro/shared';
import { databaseOrTestStore, routeError } from '../../../lib/database';
import { z } from 'zod';

type Cursor = { createdAt: string; id: string };

function encodeCursor(item: { created_at: Date | string; id: string }) {
  const createdAt = item.created_at instanceof Date ? item.created_at.toISOString() : new Date(item.created_at).toISOString();
  return Buffer.from(JSON.stringify({ createdAt, id: item.id })).toString('base64url');
}

function parseCursor(value: string | null): Cursor | null | undefined {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString()) as Partial<Cursor>;
    if (typeof parsed.createdAt !== 'string' || Number.isNaN(Date.parse(parsed.createdAt)) || typeof parsed.id !== 'string') {
      return undefined;
    }
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return undefined;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryResult = searchParams.get('category') ? CategoryEnum.safeParse(searchParams.get('category')) : null;
    const conditionResult = searchParams.get('condition') ? ConditionEnum.safeParse(searchParams.get('condition')) : null;
    const limitResult = z.coerce.number().int().min(1).max(50).safeParse(searchParams.get('limit') ?? 20);
    const cursor = parseCursor(searchParams.get('cursor'));
    if (categoryResult?.success === false || conditionResult?.success === false || !limitResult.success || cursor === undefined) {
      return NextResponse.json({ error: 'Invalid feed query' }, { status: 400 });
    }
    const category = categoryResult?.data;
    const condition = conditionResult?.data;
    const limit = limitResult.data;
    const filters = [eq(listings.status, 'ACTIVE')];
    if (category) filters.push(eq(listings.category, category));
    if (condition) filters.push(eq(listings.declared_condition, condition));
    if (cursor) {
      const createdAt = new Date(cursor.createdAt);
      filters.push(or(
        lt(listings.created_at, createdAt),
        and(eq(listings.created_at, createdAt), lt(listings.id, cursor.id)),
      )!);
    }

    const allItems = await databaseOrTestStore(
      () => db.select().from(listings).where(and(...filters)).orderBy(desc(listings.created_at), desc(listings.id)).limit(limit + 1),
      () => memoryStore.listings
        .filter((item) => {
          if (item.status !== 'ACTIVE' || (category && item.category !== category) || (condition && item.declared_condition !== condition)) return false;
          if (!cursor) return true;
          const itemTime = new Date(item.created_at).getTime();
          const cursorTime = new Date(cursor.createdAt).getTime();
          return itemTime < cursorTime || (itemTime === cursorTime && item.id < cursor.id);
        })
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime() || right.id.localeCompare(left.id))
        .slice(0, limit + 1),
    );
    const hasMore = allItems.length > limit;
    const items = allItems.slice(0, limit);

    return NextResponse.json({
      items,
      nextCursor: hasMore ? encodeCursor(items[items.length - 1]) : null,
    });
  } catch (error) {
    return routeError(error);
  }
}
