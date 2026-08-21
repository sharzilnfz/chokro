// Data hooks for the rate card: load the versioned rate history and publish new rates.
'use client';

// Shared domain types + response DTOs and the admin resource factory.
import type { Category, Condition, Unit } from '@chokro/shared';
import { RateCardEntryResponseSchema, RateCardListResponseSchema, type RateCardRow } from '@chokro/shared';
import { useAdminList, useAdminAction } from './useAdminResource';

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
  return useAdminList<{ entries?: RateEntry[] }, RateEntry>(
    ADMIN_RATE_CARDS_QUERY_KEY,
    '/api/admin/rate-card',
    (data) => data.entries,
    { schema: RateCardListResponseSchema },
  );
}

// Publishes a rate and refreshes the history cache on success.
export function usePublishRate() {
  return useAdminAction<RateEntry | undefined, PublishRateInput>({
    path: '/api/admin/rate-card',
    payload: (payload) => payload,
    schema: RateCardEntryResponseSchema,
    select: (data) => data.entry,
    invalidate: [ADMIN_RATE_CARDS_QUERY_KEY],
  });
}
