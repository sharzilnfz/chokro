// Data hooks for Admin Liability Metrics & Dynamic Cap Configuration (SPEC 13 / Ticket 09a / A11)
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';
import type { LiabilitySummary, LiabilityCapConfig, UpdateLiabilityCapInput } from '@chokro/shared';

export type LiabilityResponse = {
  summary: LiabilitySummary;
  activeCaps: LiabilityCapConfig;
  capsHistory: any[];
};

export const ADMIN_LIABILITY_QUERY_KEY = ['admin', 'wallet', 'liability'] as const;

export function useAdminLiability() {
  const { status } = useAdminAuth();

  return useQuery<LiabilityResponse>({
    queryKey: ADMIN_LIABILITY_QUERY_KEY,
    queryFn: async () => {
      const data = await adminApiRequest<LiabilityResponse>('/api/admin/wallet/liability');
      return data;
    },
    enabled: status === 'signed-in',
    refetchInterval: 20_000,
  });
}

export function useUpdateLiabilityCaps() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; activeCaps: LiabilityCapConfig },
    Error,
    UpdateLiabilityCapInput
  >({
    mutationFn: async (payload) => {
      const data = await adminApiRequest<{
        message: string;
        activeCaps: LiabilityCapConfig;
      }>('/api/admin/wallet/liability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_LIABILITY_QUERY_KEY });
    },
  });
}
