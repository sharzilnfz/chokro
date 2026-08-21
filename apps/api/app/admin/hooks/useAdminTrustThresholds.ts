// Data hooks for Trust Gate dynamic thresholds (SPEC 12 / Ticket 08a)
'use client';

import {
  ThresholdUpdateResponseSchema,
  ThresholdsResponseSchema,
  type ThresholdUpdateResponse,
  type ThresholdsResponse,
} from '@chokro/shared';
import type { TrustThresholdConfig } from '@chokro/shared';
import { useAdminResource, useAdminAction } from './useAdminResource';

// History row shape is inferred from the Trust Gate response schema, not hand-mirrored.
export type ThresholdHistoryEntry = ThresholdsResponse['history'][number];

export const ADMIN_THRESHOLDS_QUERY_KEY = ['admin', 'trust-gate', 'thresholds'] as const;

export function useAdminTrustThresholds() {
  return useAdminResource<ThresholdsResponse>(
    ADMIN_THRESHOLDS_QUERY_KEY,
    '/api/admin/trust-gate/thresholds',
    { schema: ThresholdsResponseSchema },
  );
}

export function useUpdateTrustThresholds() {
  return useAdminAction<ThresholdUpdateResponse, Partial<TrustThresholdConfig>>({
    path: '/api/admin/trust-gate/thresholds',
    method: 'PUT',
    payload: (payload) => payload,
    schema: ThresholdUpdateResponseSchema,
    invalidate: [ADMIN_THRESHOLDS_QUERY_KEY],
  });
}
