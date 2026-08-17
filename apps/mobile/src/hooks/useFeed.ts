import { useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Category, Condition } from '@/types';

type ListingStatus = 'DRAFT' | 'ACTIVE' | 'CANCELLED' | 'MATCHED' | 'EXPIRED';

type Listing = {
  id: string;
  category: Category;
  unit: 'kg' | 'piece';
  declared_weight?: string | number | null;
  piece_count?: string | number | null;
  declared_condition: Condition;
  price_bdt?: string | number | null;
  photos?: string[];
  status: ListingStatus;
  created_at?: string;
  seller_email?: string | null;
  saved?: boolean;
};

type FeedResponse = {
  items: Listing[];
  nextCursor?: string | null;
};

export type { Listing };

type FeedFilter = 'ALL' | Category;
type ConditionFilter = 'ALL' | Condition;

export type { FeedFilter, ConditionFilter };

export function useFeed(category: FeedFilter, condition: ConditionFilter, savedOnly = false) {
  return useInfiniteQuery({
    queryKey: ['feed', category, condition, savedOnly],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (category !== 'ALL') params.set('category', category);
      if (condition !== 'ALL') params.set('condition', condition);
      if (savedOnly) params.set('saved', 'true');
      if (pageParam) params.set('cursor', pageParam);
      return apiRequest<FeedResponse>(`/api/feed?${params.toString()}`);
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
