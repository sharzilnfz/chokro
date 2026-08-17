import { listingRepo } from '../../../lib/repos/listings';
import { savedListingRepo } from '../../../lib/repos/savedListings';
import { verifyAuthHeader } from '../../../lib/auth';
import { CategoryEnum, ConditionEnum } from '@chokro/shared';
import { apiData, apiError, safeRoute } from '../../../lib/http';
import { z } from 'zod';
import { KeysetPagination } from '../../../lib/domain/KeysetPagination';

export const GET = safeRoute(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const categoryResult = searchParams.get('category') ? CategoryEnum.safeParse(searchParams.get('category')) : null;
  const conditionResult = searchParams.get('condition') ? ConditionEnum.safeParse(searchParams.get('condition')) : null;
  const limitResult = z.coerce.number().int().min(1).max(50).safeParse(searchParams.get('limit') ?? 20);
  const cursor = KeysetPagination.parseCursor(searchParams.get('cursor'));
  if (categoryResult?.success === false || conditionResult?.success === false || !limitResult.success || cursor === undefined) {
    return apiError('Invalid feed query', 400);
  }
  const category = categoryResult?.data;
  const condition = conditionResult?.data;
  const limit = limitResult.data;

  const user = verifyAuthHeader(req);
  const savedFilter = searchParams.get('saved') === 'true';
  if (savedFilter && !user) {
    return apiData({ items: [], nextCursor: null });
  }

  const savedFor = savedFilter && user ? user.userId : null;
  const allItems = await listingRepo.findPublished({ category, condition, cursor, limit, savedFor });
  const hasMore = allItems.length > limit;
  const items = allItems.slice(0, limit);

  let savedIds = new Set<string>();
  if (user) {
    savedIds = new Set(await savedListingRepo.findSavedListingIds(user.userId));
  }
  const itemsWithSaved = items.map((item) => ({ ...item, saved: savedIds.has(item.id) }));

  return apiData({
    items: itemsWithSaved,
    nextCursor: hasMore ? KeysetPagination.encodeCursor(items[items.length - 1]) : null,
  });
});

