'use client';

import type { PartnerStatus } from '@chokro/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';

export type Partner = {
  id: string;
  org_name: string;
  types: string[] | string;
  e_waste_licensed: boolean;
  doe_license_doc: string | null;
  status: PartnerStatus;
};

export type UpdatePartnerInput = {
  partnerId: string;
  status: 'VERIFIED' | 'REJECTED';
};

export function useAdminPartners() {
  const { token } = useAdminAuth();

  return useQuery<Partner[]>({
    queryKey: ['adminPartners', token],
    queryFn: async () => {
      const data = await adminApiRequest<{ partners?: Partner[] }>('/api/admin/partners', {
        token,
      });
      return Array.isArray(data.partners) ? data.partners : [];
    },
    enabled: !!token,
  });
}

export function useUpdatePartnerStatus() {
  const { token } = useAdminAuth();
  const queryClient = useQueryClient();

  return useMutation<Partner | undefined, Error, UpdatePartnerInput>({
    mutationFn: async ({ partnerId, status }) => {
      const data = await adminApiRequest<{ partner?: Partner }>('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId, status }),
        token,
      });
      return data.partner;
    },
    onSuccess: (updatedPartner, variables) => {
      queryClient.setQueryData<Partner[]>(['adminPartners', token], (current) => {
        if (!current) return [];
        return current.map((item) =>
          item.id === variables.partnerId
            ? updatedPartner || { ...item, status: variables.status }
            : item,
        );
      });
      void queryClient.invalidateQueries({ queryKey: ['adminPartners', token] });
    },
  });
}
