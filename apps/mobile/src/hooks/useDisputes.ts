import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { DisputeDto, CreateDisputeInput, DisputeStatus, DisputeSourceType } from '@chokro/shared';

export function useDisputes(filters?: { status?: DisputeStatus; sourceType?: DisputeSourceType }) {
  return useQuery({
    queryKey: ['disputes', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.sourceType) params.set('sourceType', filters.sourceType);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await apiRequest<{ disputes: DisputeDto[]; count: number }>(`/api/v1/disputes${queryString}`);
      return res.disputes;
    },
  });
}

export function useCreateDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDisputeInput) => {
      const res = await apiRequest<{ message: string; dispute: DisputeDto }>('/api/v1/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.dispute;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['disputes'] });
      void queryClient.invalidateQueries({ queryKey: ['auction-lot'] });
      void queryClient.invalidateQueries({ queryKey: ['pickups'] });
    },
  });
}

export function useReleaseEscrow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ holdId, notes }: { holdId: string; notes?: string }) => {
      const res = await apiRequest<{ message: string; escrowHold: any }>(`/api/v1/escrow/${holdId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      return res.escrowHold;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auction-lot'] });
      void queryClient.invalidateQueries({ queryKey: ['escrow'] });
    },
  });
}
