import { NextResponse } from 'next/server';
import { listingRepo } from '../../../lib/repos/listings';
import { CategoryEnum, ConditionEnum } from '@chokro/shared';
import { apiError, safeRoute } from '../../../lib/http';
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

export const GET = safeRoute(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const categoryResult = searchParams.get('category') ? CategoryEnum.safeParse(searchParams.get('category')) : null;
  const conditionResult = searchParams.get('condition') ? ConditionEnum.safeParse(searchParams.get('condition')) : null;
  const limitResult = z.coerce.number().int().min(1).max(50).safeParse(searchParams.get('limit') ?? 20);
  const cursor = parseCursor(searchParams.get('cursor'));
  if (categoryResult?.success === false || conditionResult?.success === false || !limitResult.success || cursor === undefined) {
    return apiError('Invalid feed query', 400);
  }
  const category = categoryResult?.data;
  const condition = conditionResult?.data;
  const limit = limitResult.data;

  const allItems = await listingRepo.findFeedItems({ category, condition, cursor, limit });
  const hasMore = allItems.length > limit;
  const items = allItems.slice(0, limit);

  return NextResponse.json({
    items,
    nextCursor: hasMore ? encodeCursor(items[items.length - 1]) : null,
  });
});
