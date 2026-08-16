import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Category, Condition } from '@/types';

export type MyListing = {
  id: string;
  category: Category;
  unit: 'kg' | 'piece';
  declared_weight?: string | number | null;
  piece_count?: number | null;
  declared_condition: Condition;
  status: string;
};

// GET /api/listings returns only the caller's own listings; we keep the ACTIVE ones
// for the pickup booking picker.
export function useMyListings() {
  return useQuery<MyListing[]>({
    queryKey: ['my-listings'],
    queryFn: async () => {
      const data = await apiRequest<{ listings: MyListing[] }>('/api/listings');
      return (data.listings ?? []).filter((listing) => listing.status === 'ACTIVE');
    },
  });
}
