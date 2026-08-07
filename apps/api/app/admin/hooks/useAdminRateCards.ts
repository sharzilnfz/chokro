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

export function useAdminRateCards() {
  const { token } = useAdminAuth();

  return useQuery<RateEntry[]>({
    queryKey: ['adminRateCards', token],
    queryFn: async () => {
      const data = await adminApiRequest<{ entries?: RateEntry[] }>('/api/admin/rate-card', {
        token,
      });
      return Array.isArray(data.entries) ? data.entries : [];
    },
    enabled: !!token,
  });
}

export function usePublishRate() {
  const { token } = useAdminAuth();
  const queryClient = useQueryClient();

  return useMutation<RateEntry | undefined, Error, PublishRateInput>({
    mutationFn: async (payload) => {
      const data = await adminApiRequest<{ entry?: RateEntry }>('/api/admin/rate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        token,
      });
      return data.entry;
    },
    onSuccess: (newEntry) => {
      queryClient.setQueryData<RateEntry[]>(['adminRateCards', token], (current) => {
        if (!current) return newEntry ? [newEntry] : [];
        return newEntry ? [newEntry, ...current] : current;
      });
      void queryClient.invalidateQueries({ queryKey: ['adminRateCards', token] });
    },
  });
}
