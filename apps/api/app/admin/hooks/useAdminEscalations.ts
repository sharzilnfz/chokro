// Data hooks for Admin Escalation Worklist & Adjudication (SPEC 12 / Ticket 08b / A07)
'use client';

import type { EscalationWorklistItem, AdjudicateDecisionInput } from '@chokro/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';

export type EscalationsResponse = {
  escalations: EscalationWorklistItem[];
  count: number;
};

export const ADMIN_ESCALATIONS_QUERY_KEY = ['admin', 'trust-gate', 'escalations'] as const;

export function useAdminEscalations() {
  const { status } = useAdminAuth();

  return useQuery<EscalationsResponse>({
    queryKey: ADMIN_ESCALATIONS_QUERY_KEY,
    queryFn: async () => {
      const data = await adminApiRequest<EscalationsResponse>('/api/admin/trust-gate/escalations');
      return data;
    },
    enabled: status === 'signed-in',
    refetchInterval: 30_000,
  });
}

export function useAdjudicateDecision() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; action: string; decisionId: string; reason?: string },
    Error,
    { id: string; payload: AdjudicateDecisionInput }
  >({
    mutationFn: async ({ id, payload }) => {
      const data = await adminApiRequest<{
        success: boolean;
        action: string;
        decisionId: string;
        reason?: string;
      }>(`/api/admin/trust-gate/${id}/adjudicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ESCALATIONS_QUERY_KEY });
    },
  });
}
