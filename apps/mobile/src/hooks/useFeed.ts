// Paginated, filterable feed data source backed by React Query's infinite queries.
// Query infra, the API client, and the shared response DTOs.
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { FeedPage } from '@chokro/shared';
import type { Category, Condition } from '@/types';

export type { FeedPage };

// Filter selectors; 'ALL' means no filter.
type FeedFilter = 'ALL' | Category;
type ConditionFilter = 'ALL' | Condition;

export type { FeedFilter, ConditionFilter };

// Re-export the feed listing row type for screens and cards.
export type { FeedListing as Listing } from '@chokro/shared';

export function useFeed(category: FeedFilter, condition: ConditionFilter, savedOnly = false) {
  return useInfiniteQuery({
    queryKey: ['feed', category, condition, savedOnly],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (category !== 'ALL') params.set('category', category);
      if (condition !== 'ALL') params.set('condition', condition);
      if (savedOnly) params.set('saved', 'true');
      if (pageParam) params.set('cursor', pageParam);
      return apiRequest<FeedPage>(`/api/feed?${params.toString()}`);
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
