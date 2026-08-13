'use client';

import type { Category } from '@chokro/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';

export type DropZone = {
  id: string;
  institution_id: string;
  name: string;
  accepted_categories: string[];
  qr_token: string;
  status: string;
  created_at: string;
};

export type CreateDropZoneInput = {
  institutionId: string;
  name: string;
  acceptedCategories: Category[];
};

export const ADMIN_DROP_ZONES_QUERY_KEY = ['admin', 'drop-zones'] as const;

export function useAdminDropZones() {
  const { status } = useAdminAuth();

  return useQuery<DropZone[]>({
    queryKey: ADMIN_DROP_ZONES_QUERY_KEY,
    queryFn: async () => {
      const data = await adminApiRequest<{ zones?: DropZone[] }>('/api/drop-zones');
      return Array.isArray(data.zones) ? data.zones : [];
    },
    enabled: status === 'signed-in',
  });
}

export function useCreateDropZone() {
  const queryClient = useQueryClient();

  return useMutation<DropZone | undefined, Error, CreateDropZoneInput>({
    mutationFn: async (payload) => {
      const data = await adminApiRequest<{ zone?: DropZone }>('/api/drop-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return data.zone;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_DROP_ZONES_QUERY_KEY });
    },
  });
}
