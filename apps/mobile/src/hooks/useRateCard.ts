import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Rate, RowRate } from '@/types';

export type { Rate, RowRate };


function conditionOrder(condition: Rate['condition_band']) {
  return ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'].indexOf(condition);
}

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

export function useRateCard() {
  return useQuery<RowRate[]>({
    queryKey: ['rateCard'],
    queryFn: async () => {
      const data = await apiRequest<{ rates: Rate[] }>('/api/rate-card/published');
      return groupRates(Array.isArray(data.rates) ? data.rates : []);
    },
  });
}
