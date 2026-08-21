// Data hooks for Admin Dispute Arbitration & Resolution (SPEC 13 / Ticket 09b / A09)
'use client';

import type { DisputeDto, ResolveDisputeInput } from '@chokro/shared';
import { useAdminResource, useAdminAction } from './useAdminResource';

export type AdminDisputesResponse = {
  disputes: DisputeDto[];
  count: number;
};

export const ADMIN_DISPUTES_QUERY_KEY = ['admin', 'disputes'] as const;

export function useAdminDisputes(filters?: { status?: string; sourceType?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.sourceType) params.set('sourceType', filters.sourceType);
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return useAdminResource<AdminDisputesResponse>(
    [...ADMIN_DISPUTES_QUERY_KEY, filters],
    `/api/admin/disputes${queryString}`,
    { refetchInterval: 30_000 },
  );
}

export function useResolveDispute() {
  return useAdminAction<{ message: string; dispute: DisputeDto }, { id: string; payload: ResolveDisputeInput }>({
    path: ({ id }) => `/api/admin/disputes/${id}/resolve`,
    payload: ({ payload }) => payload,
    invalidate: [ADMIN_DISPUTES_QUERY_KEY],
  });
}
