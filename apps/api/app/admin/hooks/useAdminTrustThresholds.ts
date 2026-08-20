// Data hooks for Trust Gate dynamic thresholds (SPEC 12 / Ticket 08a)
'use client';

import type { TrustThresholdConfig } from '@chokro/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';

export type ThresholdHistoryEntry = {
  id: string;
  config_json: TrustThresholdConfig;
  effective_from: string;
  updated_by?: string | null;
  created_at: string;
};

export type ThresholdsResponse = {
  thresholds: TrustThresholdConfig;
  configId?: string;
  history: ThresholdHistoryEntry[];
};

export const ADMIN_THRESHOLDS_QUERY_KEY = ['admin', 'trust-gate', 'thresholds'] as const;

export function useAdminTrustThresholds() {
  const { status } = useAdminAuth();

  return useQuery<ThresholdsResponse>({
    queryKey: ADMIN_THRESHOLDS_QUERY_KEY,
    queryFn: async () => {
      const data = await adminApiRequest<ThresholdsResponse>('/api/admin/trust-gate/thresholds');
      return data;
    },
    enabled: status === 'signed-in',
  });
}

export function useUpdateTrustThresholds() {
  const queryClient = useQueryClient();

  return useMutation<
    { thresholds: TrustThresholdConfig; record: any },
    Error,
    Partial<TrustThresholdConfig>
  >({
    mutationFn: async (payload) => {
      const data = await adminApiRequest<{ thresholds: TrustThresholdConfig; record: any }>(
        '/api/admin/trust-gate/thresholds',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_THRESHOLDS_QUERY_KEY });
    },
  });
}
