import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { UnlistedCampusInput } from '@chokro/shared';

// The profile shape returned by GET /api/profile.
export interface MobileProfile {
  id: string;
  email: string;
  role: string;
  fullName: string | null;
  phone: string | null;
  institutionId: string | null;
  campusName: string | null;
  campusStatus: string | null;
  campusReason: string | null;
  studentIdDoc: string | null;
}

export const PROFILE_QUERY_KEY = ['profile'] as const;

export function useProfile(enabled = true) {
  return useQuery<{ user: MobileProfile }, Error>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => apiRequest<{ user: MobileProfile }>('/api/profile'),
    enabled,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<{ user: MobileProfile }, Error, {
    fullName?: string;
    phone?: string | null;
    campusSlug?: string | null;
    studentIdDoc?: string | null;
    newCampus?: UnlistedCampusInput;
  }>({
    mutationFn: async (payload) => apiRequest<{ user: MobileProfile }>('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
