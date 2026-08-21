// Data hooks for Admin Liability Metrics & Dynamic Cap Configuration (SPEC 13 / Ticket 09a / A11)
'use client';

import type { LiabilitySummary, LiabilityCapConfig, UpdateLiabilityCapInput } from '@chokro/shared';
import { useAdminResource, useAdminAction } from './useAdminResource';

export type LiabilityResponse = {
  summary: LiabilitySummary;
  activeCaps: LiabilityCapConfig;
  capsHistory: any[];
};

export const ADMIN_LIABILITY_QUERY_KEY = ['admin', 'wallet', 'liability'] as const;

export function useAdminLiability() {
  return useAdminResource<LiabilityResponse>(
    ADMIN_LIABILITY_QUERY_KEY,
    '/api/admin/wallet/liability',
    { refetchInterval: 20_000 },
  );
}

export function useUpdateLiabilityCaps() {
  return useAdminAction<{ message: string; activeCaps: LiabilityCapConfig }, UpdateLiabilityCapInput>({
    path: '/api/admin/wallet/liability',
    payload: (payload) => payload,
    invalidate: [ADMIN_LIABILITY_QUERY_KEY],
  });
}
