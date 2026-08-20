// Published rate card grouped by category for the rate card screen.
// Query infra and the API client.
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';

// A published per-unit price for a category across a condition band.
type Rate = {
  id: string;
  category: string;
  condition_band: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  unit: 'kg' | 'piece';
  price_bdt: string | number;
  effective_from: string;
  market_benchmark_bdt?: number;
  drift_pct?: number;
  drift_status?: 'UNDER_MARKET' | 'OVER_MARKET' | 'IN_SYNC';
  drift_badge?: string;
};

// Rates collapsed under a single category heading.
type RowRate = {
  category: string;
  entries: Rate[];
};

export type { Rate, RowRate };

// Rank condition bands from best to worst for display ordering.
function conditionOrder(condition: Rate['condition_band']) {
  return ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'].indexOf(condition);
}

// Group flat rates by category and sort each group's entries by condition band.
function groupRates(rates: Rate[]): RowRate[] {
  const byCategory = new Map<string, Rate[]>();
  for (const rate of rates) {
    const bucket = byCategory.get(rate.category) ?? [];
    bucket.push(rate);
    byCategory.set(rate.category, bucket);
  }
  return Array.from(byCategory.entries()).map(([category, entries]) => ({
    category,
    entries: entries.sort(
      (a, b) => conditionOrder(a.condition_band) - conditionOrder(b.condition_band),
    ),
  }));
}

// Query that fetches the published card and returns the grouped rows.
export function useRateCard() {
  return useQuery<RowRate[]>({
    queryKey: ['rateCard'],
    queryFn: async () => {
      const data = await apiRequest<{ rates: Rate[] }>('/api/rate-card/published');
      return groupRates(Array.isArray(data.rates) ? data.rates : []);
    },
  });
}
