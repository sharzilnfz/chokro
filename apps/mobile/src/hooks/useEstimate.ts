// Live per-unit payout estimate for a category and condition combination.
// Query infra, the API client's error type, and shared domain types.
import { useQuery } from '@tanstack/react-query';
import { apiRequest, ApiError } from '@/services/api';
import type { Category, Condition } from '@/types';

// Estimate payload: per-unit price and the unit the price applies to.
type Estimate = {
  price_bdt: string;
  unit: 'kg' | 'piece';
  category: string;
  condition_band: string;
};

export type { Estimate };

// Estimates keyed on the selected category/condition; 404 means "not on the card".
export function useEstimate(category: Category, condition: Condition) {
  return useQuery<Estimate | null>({
    queryKey: ['estimate', category, condition],
    // Fetch the per-unit price for the chosen category and condition.
    queryFn: async () => {
      const data = await apiRequest<{ estimate: Estimate }>(
        `/api/rate-card/estimate?category=${encodeURIComponent(category)}&condition=${encodeURIComponent(condition)}`,
      );
      return data.estimate;
    },

    // Don't retry when the combination isn't found; retry network hiccups twice.
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}
