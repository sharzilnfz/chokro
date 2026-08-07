import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

type Rate = {
  id: string;
  category: string;
  condition_band: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  unit: 'kg' | 'piece';
  price_bdt: string | number;
  effective_from: string;
};

type RowRate = {
  category: string;
  entries: Rate[];
};

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
  const { token } = useAuth();

  return useQuery<RowRate[]>({
    queryKey: ['rateCard', token],
    queryFn: async () => {
      const data = await apiRequest<{ rates: Rate[] }>('/api/rate-card/published', { token });
      return groupRates(Array.isArray(data.rates) ? data.rates : []);
    },
    enabled: !!token,
  });
}
