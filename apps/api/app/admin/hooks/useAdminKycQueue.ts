// Data hooks for the KYC adjudication queue: list extractions with OCR diffs and record adjudication decisions.
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';

export type KycQueueItem = {
  id: string;
  partnerId: string;
  partnerOrgName: string;
  partnerStatus: string;
  partnerTypes: string[];
  documentUrl: string;
  documentType: string;
  ocrProvider: string;
  rawExtractedText: string | null;
  extractedOrgName: string | null;
  extractedLicenseNumber: string | null;
  extractedExpiryDate: string | Date | null;
  confidenceScore: number;
  matchStatus: string;
  mismatchedFields: string[];
  isExpired: boolean;
  adjudicatedBy: string | null;
  adjudicatedAt: string | Date | null;
  adjudicationNotes: string | null;
  createdAt: string | Date;
  diffs: {
    orgNameMismatch: boolean;
    licenseMismatch: boolean;
    isExpired: boolean;
  };
};

export type AdjudicateKycInput = {
  extractionId: string;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_REUPLOAD';
  notes?: string;
  grantEwasteLicense?: boolean;
};

export const ADMIN_KYC_QUEUE_QUERY_KEY = ['admin', 'kyc-queue'] as const;

export function useAdminKycQueue(statusFilter?: string) {
  const { status } = useAdminAuth();

  return useQuery<KycQueueItem[]>({
    queryKey: [...ADMIN_KYC_QUEUE_QUERY_KEY, statusFilter || 'ALL'],
    queryFn: async () => {
      const url = statusFilter && statusFilter !== 'ALL'
        ? `/api/v1/admin/partners/kyc/queue?status=${statusFilter}`
        : '/api/v1/admin/partners/kyc/queue';
      const data = await adminApiRequest<{ queue?: KycQueueItem[] }>(url);
      return Array.isArray(data.queue) ? data.queue : [];
    },
    enabled: status === 'signed-in',
  });
}

export function useAdjudicateKyc() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, AdjudicateKycInput>({
    mutationFn: async ({ extractionId, decision, notes, grantEwasteLicense }) => {
      return adminApiRequest(`/api/v1/admin/partners/kyc/${extractionId}/adjudicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes, grantEwasteLicense }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_KYC_QUEUE_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
    },
  });
}
