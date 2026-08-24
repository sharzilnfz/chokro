// Live per-unit payout estimate for a category and condition combination.
// Query infra, the API client's error type, and shared domain types.
import { useQuery } from '@tanstack/react-query';
import { apiRequest, ApiError } from '@/services/api';
import type { Category, Condition } from '@/types';

type MarketBenchmark = {
  benchmark_bdt: number;
  drift_pct: number;
  drift_status: 'UNDER_MARKET' | 'OVER_MARKET' | 'IN_SYNC';
  badge_text: string;
  source: string;
};

type Estimate = {
  price_bdt: string;
  unit: 'kg' | 'piece';
  category: string;
  condition_band: string;
  quantity?: number;
  total_bdt?: number;
  market_benchmark?: MarketBenchmark | null;
};

export type { Estimate, MarketBenchmark };

// Estimates keyed on the selected category/condition; 404 means "not on the card".
export function useEstimate(
  category: Category,
  condition: Condition,
  weight?: number,
  pieceCount?: number,
  enabled = true,
) {
  return useQuery<Estimate | null>({
    queryKey: ['estimate', category, condition, weight ?? null, pieceCount ?? null],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams({ category, condition });
      if (weight !== undefined) params.set('weight', String(weight));
      if (pieceCount !== undefined) params.set('pieceCount', String(pieceCount));
      const data = await apiRequest<{ estimate: Estimate }>(
        `/api/rate-card/estimate?${params.toString()}`,
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
