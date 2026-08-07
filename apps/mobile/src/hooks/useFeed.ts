import { useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { Category, Condition } from '@/types';

type ListingStatus = 'DRAFT' | 'ACTIVE' | 'CANCELLED' | 'MATCHED' | 'EXPIRED';

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

type FeedResponse = {
  items: Listing[];
  nextCursor?: string | null;
};

export type { Listing };

type FeedFilter = 'ALL' | Category;
type ConditionFilter = 'ALL' | Condition;

export function useFeed(category: FeedFilter, condition: ConditionFilter) {
  const { token } = useAuth();

  return useInfiniteQuery<FeedResponse, Error>({
    queryKey: ['feed', category, condition, token],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (category !== 'ALL') params.set('category', category);
      if (condition !== 'ALL') params.set('condition', condition);
      if (pageParam) params.set('cursor', pageParam as string);
      return apiRequest<FeedResponse>(`/api/feed?${params.toString()}`, { token });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!token,
  });
}
