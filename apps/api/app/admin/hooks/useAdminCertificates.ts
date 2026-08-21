// Data hooks for Admin ESG Certificates & DoE E-Waste Compliance (A12).
'use client';

import type { GenerateCertificateInput, EwasteComplianceReport } from '@chokro/shared';
import { useAdminList, useAdminResource, useAdminAction } from './useAdminResource';

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
  return useAdminList<{ certificates?: AdminCertificateListItem[] }, AdminCertificateListItem>(
    ADMIN_CERTIFICATES_QUERY_KEY,
    '/api/admin/impact/certificates',
    (data) => data.certificates,
  );
}

export function useAdminEwasteCompliance(institutionId?: string) {
  const url = institutionId
    ? `/api/admin/impact/ewaste-compliance?institutionId=${encodeURIComponent(institutionId)}`
    : '/api/admin/impact/ewaste-compliance';

  return useAdminResource<{ complianceReport?: EwasteComplianceReport } & EwasteComplianceReport>(
    [...ADMIN_EWASTE_COMPLIANCE_QUERY_KEY, institutionId || 'all'],
    url,
  );
}

export function useGenerateCertificate() {
  return useAdminAction<any, GenerateCertificateInput>({
    path: '/api/certificates/generate',
    payload: (payload) => payload,
    select: (data) => data.certificate,
    invalidate: [ADMIN_CERTIFICATES_QUERY_KEY],
  });
}
