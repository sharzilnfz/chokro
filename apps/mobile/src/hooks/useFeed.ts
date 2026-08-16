import { useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Category, Condition, Listing, FeedResponse } from '@/types';

export type { Listing };


type FeedFilter = 'ALL' | Category;
type ConditionFilter = 'ALL' | Condition;

export type { FeedFilter, ConditionFilter };

export function useFeed(category: FeedFilter, condition: ConditionFilter) {
  return useInfiniteQuery({
    queryKey: ['feed', category, condition],
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
