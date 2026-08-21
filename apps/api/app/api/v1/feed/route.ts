// GET /api/feed — public. Streams published listings, filterable by category/condition/geo
// and paged via a keyset cursor.
import { apiData, safeRoute } from '@/lib/http';
import { FeedDomain } from '@/lib/domain/FeedDomain';

// Returns one page of published listings plus a cursor for paging to the next page.
export const GET = safeRoute(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const query = FeedDomain.parseFeedQuery(searchParams);
  const page = await FeedDomain.getFeedPage(query, req);

  return apiData(page);
});
export { OPTIONS } from '@/lib/http';
