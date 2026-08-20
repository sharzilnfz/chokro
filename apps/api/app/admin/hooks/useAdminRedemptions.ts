// Data hooks for Admin Redemptions Queue & MFS Settlement (SPEC 13 / Ticket 09a / A10)
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';
import type { RedemptionRequestRecord, SettleRedemptionInput } from '@chokro/shared';

export type RedemptionsResponse = {
  redemptions: RedemptionRequestRecord[];
};

export const ADMIN_REDEMPTIONS_QUERY_KEY = ['admin', 'wallet', 'redemptions'] as const;

export function useAdminRedemptions(statusFilter?: string) {
  const { status } = useAdminAuth();

  return useQuery<RedemptionsResponse>({
    queryKey: [...ADMIN_REDEMPTIONS_QUERY_KEY, statusFilter || 'ALL'],
    queryFn: async () => {
      const query = statusFilter && statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const data = await adminApiRequest<RedemptionsResponse>(`/api/admin/wallet/redemptions${query}`);
      return data;
    },
    enabled: status === 'signed-in',
    refetchInterval: 15_000,
  });
}

export function useSettleRedemption() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; redemption: any; payout?: any; action: string },
    Error,
    { id: string; payload: SettleRedemptionInput }
  >({
    mutationFn: async ({ id, payload }) => {
      const data = await adminApiRequest<{
        message: string;
        redemption: any;
        payout?: any;
        action: string;
      }>(`/api/wallet/redemptions/${id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_REDEMPTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'wallet', 'liability'] });
    },
  });
}
