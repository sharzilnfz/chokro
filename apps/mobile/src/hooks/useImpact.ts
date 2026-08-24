// Mobile hooks for personal impact, institutional sustainability dashboards, and ESG certificates (SPEC 14 / Ticket 10)
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { PersonalImpactSummary, InstitutionImpactSummary, PublicCertificateView } from '@chokro/shared';

export function usePersonalImpact() {
  return useQuery<PersonalImpactSummary>({
    queryKey: ['impact', 'personal'],
    queryFn: async () => {
      const data = await apiRequest<{ impact?: PersonalImpactSummary } & PersonalImpactSummary>(
        '/api/v1/impact/personal'
      );
      return data.impact || data;
    },
  });
}

export function useInstitutionImpact(institutionIdOrSlug?: string | null) {
  return useQuery<InstitutionImpactSummary>({
    queryKey: ['impact', 'institution', institutionIdOrSlug],
    queryFn: async () => {
      if (!institutionIdOrSlug) throw new Error('No institution ID provided');
      const data = await apiRequest<{ institutionImpact?: InstitutionImpactSummary } & InstitutionImpactSummary>(
        `/api/v1/impact/institutions/${encodeURIComponent(institutionIdOrSlug)}`
      );
      return data.institutionImpact || data;
    },
    enabled: Boolean(institutionIdOrSlug),
  });
}

export function useCertificate(ref?: string | null) {
  return useQuery<PublicCertificateView>({
    queryKey: ['certificate', ref],
    queryFn: async () => {
      if (!ref) throw new Error('No certificate reference provided');
      const data = await apiRequest<{ certificate?: PublicCertificateView } & PublicCertificateView>(
        `/api/v1/certificates/${encodeURIComponent(ref)}`
      );
      return data.certificate || data;
    },
    enabled: Boolean(ref),
  });
}
