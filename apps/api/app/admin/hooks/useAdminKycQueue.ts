// Data hooks for the KYC adjudication queue: list extractions with OCR diffs and record adjudication decisions.
'use client';

import { useAdminList, useAdminAction } from './useAdminResource';

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
export const ADMIN_PARTNERS_QUERY_KEY = ['admin', 'partners'] as const;

export function useAdminKycQueue(statusFilter?: string) {
  const url = statusFilter && statusFilter !== 'ALL'
    ? `/api/v1/admin/partners/kyc/queue?status=${statusFilter}`
    : '/api/v1/admin/partners/kyc/queue';

  return useAdminList<{ queue?: KycQueueItem[] }, KycQueueItem>(
    [...ADMIN_KYC_QUEUE_QUERY_KEY, statusFilter || 'ALL'],
    url,
    (data) => data.queue,
  );
}

export function useAdjudicateKyc() {
  return useAdminAction<unknown, AdjudicateKycInput>({
    path: ({ extractionId }) => `/api/v1/admin/partners/kyc/${extractionId}/adjudicate`,
    payload: ({ decision, notes, grantEwasteLicense }) => ({ decision, notes, grantEwasteLicense }),
    invalidate: [ADMIN_KYC_QUEUE_QUERY_KEY, ADMIN_PARTNERS_QUERY_KEY],
  });
}
