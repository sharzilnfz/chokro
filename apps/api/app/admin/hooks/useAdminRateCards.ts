// Data hooks for the rate card: load the versioned rate history and publish new rates.
'use client';

// Shared domain types + response DTOs, React Query primitives, auth session, admin fetch wrapper.
import type { Category, Condition, Unit } from '@chokro/shared';
import { RateCardEntryResponseSchema, RateCardListResponseSchema, type RateCardRow } from '@chokro/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';

// A single row of the rate-card history as returned by the admin API.
export type RateEntry = RateCardRow;

// Payload describing a new rate entry to publish.
export type PublishRateInput = {
  category: Category;
  conditionBand: Condition;
  unit: Unit;
  priceBdt: number;
};

// Cache key so queries and mutations can share/invalidate the same rate history data.
export const ADMIN_RATE_CARDS_QUERY_KEY = ['admin', 'rate-cards'] as const;

// Loads the full rate-card history once the admin session is active.
export function useAdminRateCards() {
  const { status } = useAdminAuth();

  return useQuery<RateEntry[]>({
    queryKey: ADMIN_RATE_CARDS_QUERY_KEY,
    queryFn: async () => {
      const data = await adminApiRequest<{ entries?: RateEntry[] }>('/api/admin/rate-card', {
        schema: RateCardListResponseSchema,
      });
      return Array.isArray(data.entries) ? data.entries : [];
    },
    enabled: status === 'signed-in',
  });
}

// Publishes a rate and refreshes the history cache on success.
export function usePublishRate() {
  const queryClient = useQueryClient();

  return useMutation<RateEntry | undefined, Error, PublishRateInput>({
    mutationFn: async (payload) => {
      const data = await adminApiRequest<{ entry?: RateEntry }>('/api/admin/rate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        schema: RateCardEntryResponseSchema,
      });
      return data.entry;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_RATE_CARDS_QUERY_KEY });
    },
  });
}
