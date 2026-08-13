'use client';

import type { PartnerStatus } from '@chokro/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';

export type Partner = {
  id: string;
  org_name: string;
  types: string[];
  e_waste_licensed: boolean;
  doe_license_doc: string | null;
  status: PartnerStatus;
};

export type UpdatePartnerInput = {
  partnerId: string;
  status: 'VERIFIED' | 'REJECTED';
};

export const ADMIN_PARTNERS_QUERY_KEY = ['admin', 'partners'] as const;

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

export function useUpdatePartnerStatus() {
  const queryClient = useQueryClient();

  return useMutation<Partner | undefined, Error, UpdatePartnerInput>({
    mutationFn: async ({ partnerId, status }) => {
      const data = await adminApiRequest<{ partner?: Partner }>('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId, status }),
      });
      return data.partner;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_PARTNERS_QUERY_KEY });
    },
  });
}
