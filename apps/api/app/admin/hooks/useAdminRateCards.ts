'use client';

import type { Category, Condition, Unit } from '@chokro/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';

export type RateEntry = {
  id: string;
  category: string;
  condition_band: string;
  unit: Unit;
  price_bdt: string | number;
  effective_from: string;
};

export type PublishRateInput = {
  category: Category;
  conditionBand: Condition;
  unit: Unit;
  priceBdt: number;
};

export const ADMIN_RATE_CARDS_QUERY_KEY = ['admin', 'rate-cards'] as const;

export function useAdminRateCards() {
  const { status } = useAdminAuth();

  return useQuery<RateEntry[]>({
    queryKey: ADMIN_RATE_CARDS_QUERY_KEY,
    queryFn: async () => {
      const data = await adminApiRequest<{ entries?: RateEntry[] }>('/api/admin/rate-card');
      return Array.isArray(data.entries) ? data.entries : [];
    },
    enabled: status === 'signed-in',
  });
}

export function usePublishRate() {
  const queryClient = useQueryClient();

  return useMutation<RateEntry | undefined, Error, PublishRateInput>({
    mutationFn: async (payload) => {
      const data = await adminApiRequest<{ entry?: RateEntry }>('/api/admin/rate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return data.entry;
    },
    onSuccess: (newEntry) => {
      queryClient.setQueryData<RateEntry[]>(ADMIN_RATE_CARDS_QUERY_KEY, (current) => {
        if (!current) return newEntry ? [newEntry] : [];
        return newEntry ? [newEntry, ...current] : current;
      });
      void queryClient.invalidateQueries({ queryKey: ADMIN_RATE_CARDS_QUERY_KEY });
    },
  });
}
