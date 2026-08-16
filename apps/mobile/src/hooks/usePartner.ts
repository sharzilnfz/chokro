// usePartner hook: checks user's partner application status and handles submission with auto-polling.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { PartnerApplyInput, PartnerStatus } from '@chokro/shared';

export interface MobilePartner {
  id: string;
  user_id: string;
  org_name: string;
  types: string[];
  e_waste_licensed: boolean;
  doe_license_doc: string | null;
  status: PartnerStatus;
  reason?: string | null;
  capability_flags?: Record<string, boolean>;
  created_at: string;
}

export const PARTNER_ME_QUERY_KEY = ['partner', 'me'] as const;

export function usePartner() {
  return useQuery<{ partner: MobilePartner | null }, Error>({
    queryKey: PARTNER_ME_QUERY_KEY,
    queryFn: async () => {
      try {
        const data = await apiRequest<{ partner: MobilePartner }>('/api/partners/me');
        return data;
      } catch (err: any) {
        // If 404, applicant has not submitted yet
        if (err?.message?.includes('404') || err?.message?.includes('not found')) {
          return { partner: null };
        }
        throw err;
      }
    },
    staleTime: 15000, // 15 seconds
    refetchInterval: 30000, // Auto-poll every 30s so mounted status screen picks up admin reviews live
  });
}

export function useApplyPartner() {
  const queryClient = useQueryClient();

  return useMutation<{ partner: MobilePartner }, Error, PartnerApplyInput>({
    mutationFn: async (payload: PartnerApplyInput) => {
      return apiRequest<{ partner: MobilePartner }>('/api/partners/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PARTNER_ME_QUERY_KEY });
    },
  });
}

export function useUpdatePartnerCapabilities() {
  const queryClient = useQueryClient();

  return useMutation<
    { partner: MobilePartner },
    Error,
    Record<string, boolean>
  >({
    mutationFn: async (capabilityFlags: Record<string, boolean>) => {
      return apiRequest<{ partner: MobilePartner }>('/api/partners/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capabilityFlags }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PARTNER_ME_QUERY_KEY });
    },
  });
}
