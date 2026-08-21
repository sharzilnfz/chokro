// Data hooks for the partner queue: list applications and record verification decisions.
'use client';

// Shared partner status type and the admin resource factory.
import type { PartnerStatus } from '@chokro/shared';
import { useAdminList, useAdminAction } from './useAdminResource';

// One partner application as returned by the admin API.
export type Partner = {
  id: string;
  org_name: string;
  types: string[];
  e_waste_licensed: boolean;
  doe_license_doc: string | null;
  status: PartnerStatus;
  reason?: string | null;
  capability_flags?: Record<string, boolean>;
};

// Payload for the approve/reject decision on a specific partner.
export type UpdatePartnerInput = {
  partnerId: string;
  status: 'VERIFIED' | 'REJECTED';
  reason?: string;
};

// Cache key shared by the list query and the status mutation.
export const ADMIN_PARTNERS_QUERY_KEY = ['admin', 'partners'] as const;

// Loads all partner applications once the admin session is active.
export function useAdminPartners() {
  return useAdminList<{ partners?: Partner[] }, Partner>(
    ADMIN_PARTNERS_QUERY_KEY,
    '/api/admin/partners',
    (data) => data.partners,
  );
}

// Records an approve/reject decision and refreshes the queue on success.
export function useUpdatePartnerStatus() {
  return useAdminAction<Partner | undefined, UpdatePartnerInput>({
    path: '/api/admin/partners',
    payload: ({ partnerId, status, reason }) => ({ partnerId, status, reason }),
    select: (data) => data.partner,
    invalidate: [ADMIN_PARTNERS_QUERY_KEY],
  });
}
