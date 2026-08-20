'use client';
import type { Campus, CampusStatus } from '@chokro/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';

export type CampusInput = {
  name: string;
  division: string;
  zilla: string;
  upazilla: string;
  slug?: string;
  status?: CampusStatus;
};

export type UpdateStatusInput = {
  id: string;
  status: CampusStatus;
  reason?: string;
};

export const ADMIN_CAMPUSES_QUERY_KEY = ['admin', 'campuses'] as const;

export function useAdminCampuses(statusFilter?: CampusStatus) {
  const { status } = useAdminAuth();
  return useQuery<Campus[]>({
    queryKey: [...ADMIN_CAMPUSES_QUERY_KEY, statusFilter ?? 'all'],
    queryFn: async () => {
      const url = statusFilter
        ? `/api/admin/campuses?status=${statusFilter}`
        : '/api/admin/campuses';
      const data = await adminApiRequest<{ campuses?: Campus[] }>(url);
      return Array.isArray(data.campuses) ? data.campuses : [];
    },
    enabled: status === 'signed-in',
  });
}

export function useCreateCampus() {
  const queryClient = useQueryClient();
  return useMutation<Campus | undefined, Error, CampusInput>({
    mutationFn: async (payload) => {
      const data = await adminApiRequest<{ campus?: Campus }>('/api/admin/campuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return data.campus;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_CAMPUSES_QUERY_KEY });
    },
  });
}

export function useUpdateCampusStatus() {
  const queryClient = useQueryClient();
  return useMutation<Campus | undefined, Error, UpdateStatusInput>({
    mutationFn: async ({ id, status, reason }) => {
      const data = await adminApiRequest<{ campus?: Campus }>(`/api/admin/campuses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      });
      return data.campus;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_CAMPUSES_QUERY_KEY });
    },
  });
}

export function useRemoveCampus() {
  const queryClient = useQueryClient();
  return useMutation<Campus | undefined, Error, string>({
    mutationFn: async (id) => {
      const data = await adminApiRequest<{ campus?: Campus }>(`/api/admin/campuses/${id}`, {
        method: 'DELETE',
      });
      return data.campus;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_CAMPUSES_QUERY_KEY });
    },
  });
}
