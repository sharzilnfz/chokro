// Data hooks for campuses: list institutions by status and record create/status/remove decisions.
'use client';
import type { Campus, CampusStatus } from '@chokro/shared';
import { CampusListResponseSchema, CampusMutationResponseSchema } from '@chokro/shared';
import { useAdminList, useAdminAction } from './useAdminResource';

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
  return useAdminList<{ campuses?: Campus[] }, Campus>(
    [...ADMIN_CAMPUSES_QUERY_KEY, statusFilter ?? 'all'],
    statusFilter ? `/api/admin/campuses?status=${statusFilter}` : '/api/admin/campuses',
    (data) => data.campuses,
    { schema: CampusListResponseSchema },
  );
}

export function useCreateCampus() {
  return useAdminAction<Campus | undefined, CampusInput>({
    path: '/api/admin/campuses',
    payload: (payload) => payload,
    schema: CampusMutationResponseSchema,
    select: (data) => data.campus,
    invalidate: [ADMIN_CAMPUSES_QUERY_KEY],
  });
}

export function useUpdateCampusStatus() {
  return useAdminAction<Campus | undefined, UpdateStatusInput>({
    path: ({ id }) => `/api/admin/campuses/${id}`,
    method: 'PATCH',
    payload: ({ status, reason }) => ({ status, reason }),
    schema: CampusMutationResponseSchema,
    select: (data) => data.campus,
    invalidate: [ADMIN_CAMPUSES_QUERY_KEY],
  });
}

export function useRemoveCampus() {
  return useAdminAction<Campus | undefined, string>({
    path: (id) => `/api/admin/campuses/${id}`,
    method: 'DELETE',
    schema: CampusMutationResponseSchema,
    select: (data) => data.campus,
    invalidate: [ADMIN_CAMPUSES_QUERY_KEY],
  });
}
