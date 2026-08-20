// Data hooks for the partner queue: list applications and record verification decisions.
'use client';

// Shared partner status type, React Query primitives, auth session, and the admin fetch wrapper.
import type { PartnerStatus } from '@chokro/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';

// One partner application as returned by the admin API.
export type Partner = {
  id: string;
  org_name: string;
  types: string[];
  e_waste_licensed: boolean;
  doe_license_doc: string | null;
  status: PartnerStatus;
  reason?: string | null;
  capability_flags?: Record<string, boolean>;
};

// Payload for the approve/reject decision on a specific partner.
export type UpdatePartnerInput = {
  partnerId: string;
  status: 'VERIFIED' | 'REJECTED';
  reason?: string;
};

// Cache key shared by the list query and the status mutation.
export const ADMIN_PARTNERS_QUERY_KEY = ['admin', 'partners'] as const;

// Loads all partner applications once the admin session is active.
export function useAdminPartners() {
  const { status } = useAdminAuth();

  return useQuery<Partner[]>({
    queryKey: ADMIN_PARTNERS_QUERY_KEY,
    queryFn: async () => {
      const data = await adminApiRequest<{ partners?: Partner[] }>('/api/admin/partners');
      return Array.isArray(data.partners) ? data.partners : [];
    },
    enabled: status === 'signed-in',
  });
}

// Records an approve/reject decision and refreshes the queue on success.
export function useUpdatePartnerStatus() {
  const queryClient = useQueryClient();

  return useMutation<Partner | undefined, Error, UpdatePartnerInput>({
    mutationFn: async ({ partnerId, status, reason }) => {
      const data = await adminApiRequest<{ partner?: Partner }>('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId, status, reason }),
      });
      return data.partner;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_PARTNERS_QUERY_KEY });
    },
  });
}
