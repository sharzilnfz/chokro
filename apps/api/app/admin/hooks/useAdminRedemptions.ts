// Data hooks for Admin Redemptions Queue & MFS Settlement (SPEC 13 / Ticket 09a / A10)
'use client';

import type { RedemptionRequestRecord, SettleRedemptionInput } from '@chokro/shared';
import { useAdminResource, useAdminAction } from './useAdminResource';

export type RedemptionsResponse = {
  redemptions: RedemptionRequestRecord[];
};

export const ADMIN_REDEMPTIONS_QUERY_KEY = ['admin', 'wallet', 'redemptions'] as const;
export const ADMIN_LIABILITY_QUERY_KEY = ['admin', 'wallet', 'liability'] as const;

export function useAdminRedemptions(statusFilter?: string) {
  const query = statusFilter && statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';

  return useAdminResource<RedemptionsResponse>(
    [...ADMIN_REDEMPTIONS_QUERY_KEY, statusFilter || 'ALL'],
    `/api/admin/wallet/redemptions${query}`,
    { refetchInterval: 15_000 },
  );
}

export function useSettleRedemption() {
  return useAdminAction<
    { message: string; redemption: any; payout?: any; action: string },
    { id: string; payload: SettleRedemptionInput }
  >({
    path: ({ id }) => `/api/wallet/redemptions/${id}/settle`,
    payload: ({ payload }) => payload,
    invalidate: [ADMIN_REDEMPTIONS_QUERY_KEY, ADMIN_LIABILITY_QUERY_KEY],
  });
}
