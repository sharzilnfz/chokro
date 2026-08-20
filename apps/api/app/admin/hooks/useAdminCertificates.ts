'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';
import type { GenerateCertificateInput, EwasteComplianceReport } from '@chokro/shared';

export interface AdminCertificateListItem {
  id: string;
  institution_id: string;
  institution_name?: string;
  institution_slug?: string;
  certificate_ref: string;
  period_start: string;
  period_end: string;
  total_mass_kg: string | number;
  total_co2e_kg: string | number;
  covered_record_ids: string[];
  signature_hash: string;
  issued_at: string;
}

export const ADMIN_CERTIFICATES_QUERY_KEY = ['admin', 'certificates'] as const;
export const ADMIN_EWASTE_COMPLIANCE_QUERY_KEY = ['admin', 'ewaste-compliance'] as const;

export function useAdminCertificates() {
  const { status } = useAdminAuth();
  return useQuery<AdminCertificateListItem[]>({
    queryKey: ADMIN_CERTIFICATES_QUERY_KEY,
    queryFn: async () => {
      const data = await adminApiRequest<{ certificates?: AdminCertificateListItem[] }>(
        '/api/admin/impact/certificates'
      );
      return Array.isArray(data.certificates) ? data.certificates : [];
    },
    enabled: status === 'signed-in',
  });
}

export function useAdminEwasteCompliance(institutionId?: string) {
  const { status } = useAdminAuth();
  return useQuery<EwasteComplianceReport>({
    queryKey: [...ADMIN_EWASTE_COMPLIANCE_QUERY_KEY, institutionId || 'all'],
    queryFn: async () => {
      const url = institutionId
        ? `/api/admin/impact/ewaste-compliance?institutionId=${encodeURIComponent(institutionId)}`
        : '/api/admin/impact/ewaste-compliance';
      const data = await adminApiRequest<{ complianceReport?: EwasteComplianceReport } & EwasteComplianceReport>(url);
      return data.complianceReport || data;
    },
    enabled: status === 'signed-in',
  });
}

export function useGenerateCertificate() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, GenerateCertificateInput>({
    mutationFn: async (payload) => {
      const data = await adminApiRequest<{ certificate?: any }>('/api/certificates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return data.certificate;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_CERTIFICATES_QUERY_KEY });
    },
  });
}
