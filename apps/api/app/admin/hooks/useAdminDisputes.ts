// Data hooks for Admin Dispute Arbitration & Resolution (SPEC 13 / Ticket 09b / A09)
'use client';

import type { DisputeDto, ResolveDisputeInput } from '@chokro/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';

export type AdminDisputesResponse = {
  disputes: DisputeDto[];
  count: number;
};

export const ADMIN_DISPUTES_QUERY_KEY = ['admin', 'disputes'] as const;

export function useAdminDisputes(filters?: { status?: string; sourceType?: string }) {
  const { status } = useAdminAuth();

  return useQuery<AdminDisputesResponse>({
    queryKey: [...ADMIN_DISPUTES_QUERY_KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.sourceType) params.set('sourceType', filters.sourceType);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const data = await adminApiRequest<AdminDisputesResponse>(`/api/admin/disputes${queryString}`);
      return data;
    },
    enabled: status === 'signed-in',
    refetchInterval: 30_000,
  });
}

export function useResolveDispute() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; dispute: DisputeDto },
    Error,
    { id: string; payload: ResolveDisputeInput }
  >({
    mutationFn: async ({ id, payload }) => {
      const data = await adminApiRequest<{
        message: string;
        dispute: DisputeDto;
      }>(`/api/admin/disputes/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_DISPUTES_QUERY_KEY });
    },
  });
}
