// GET /api/feed — public. Streams published listings, filterable by category/condition
// and paged via a keyset cursor.
import { listingRepo } from '../../../lib/repos/listings';
import { savedListingRepo } from '../../../lib/repos/savedListings';
import { verifyAuthHeader } from '../../../lib/auth';
import { CategoryEnum, ConditionEnum } from '@chokro/shared';
import { apiData, apiError, safeRoute } from '../../../lib/http';
import { z } from 'zod';
import { KeysetPagination } from '../../../lib/domain/KeysetPagination';

// Returns one page of published listings plus a cursor for paging to the next page.
export const GET = safeRoute(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const categoryResult = searchParams.get('category') ? CategoryEnum.safeParse(searchParams.get('category')) : null;
  const conditionResult = searchParams.get('condition') ? ConditionEnum.safeParse(searchParams.get('condition')) : null;
  const limitResult = z.coerce.number().int().min(1).max(50).safeParse(searchParams.get('limit') ?? 20);
  const cursor = KeysetPagination.parseCursor(searchParams.get('cursor'));
  // Reject the query if any optional filter or the cursor failed to parse.
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
  // Fetch one row beyond the page size so we can tell whether another page exists.
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

