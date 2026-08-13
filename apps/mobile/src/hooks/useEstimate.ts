import { useQuery } from '@tanstack/react-query';
import { apiRequest, ApiError } from '@/services/api';
import type { Category, Condition } from '@/types';

type Estimate = {
  price_bdt: string;
  unit: 'kg' | 'piece';
  category: string;
  condition_band: string;
};

export type { Estimate };

export function useEstimate(category: Category, condition: Condition) {
  return useQuery<Estimate | null>({
    queryKey: ['estimate', category, condition],
    queryFn: async () => {
      const data = await apiRequest<{ estimate: Estimate }>(
        `/api/rate-card/estimate?category=${encodeURIComponent(category)}&condition=${encodeURIComponent(condition)}`,
      );
      return data.estimate;
    },

    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}
