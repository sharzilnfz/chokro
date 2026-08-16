// Paginated, filterable feed data source backed by React Query's infinite queries.
// Query infra and the API client.
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Category, Condition } from '@/types';

// Possible lifecycle states a listing can be in.
type ListingStatus = 'DRAFT' | 'ACTIVE' | 'CANCELLED' | 'MATCHED' | 'EXPIRED';

// Shape of a single listing returned by the feed API.
type Listing = {
  id: string;
  category: Category;
  unit: 'kg' | 'piece';
  declared_weight?: string | number | null;
  piece_count?: string | number | null;
  declared_condition: Condition;
  photos?: string[];
  status: ListingStatus;
  created_at?: string;
};

// One feed page: entries plus the cursor for the next page.
type FeedResponse = {
  items: Listing[];
  nextCursor?: string | null;
};

export type { Listing };

// Filter selectors; 'ALL' means no filter.
type FeedFilter = 'ALL' | Category;
type ConditionFilter = 'ALL' | Condition;

export type { FeedFilter, ConditionFilter };

// Infinite query keyed by the active filters, fetching 20 listings per page.
export function useFeed(category: FeedFilter, condition: ConditionFilter) {
  return useInfiniteQuery({
    queryKey: ['feed', category, condition],
    // Build query-string filters from the selections, plus the cursor for pageParam.
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (category !== 'ALL') params.set('category', category);
      if (condition !== 'ALL') params.set('condition', condition);
      if (pageParam) params.set('cursor', pageParam);
      return apiRequest<FeedResponse>(`/api/feed?${params.toString()}`);
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
