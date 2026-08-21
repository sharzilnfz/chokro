// Data hooks for Admin Escalation Worklist & Adjudication (SPEC 12 / Ticket 08b / A07)
'use client';

import {
  AdjudicationResponseSchema,
  EscalationsResponseSchema,
  type AdjudicationResponse,
  type EscalationsResponse,
  type EscalationWorklistItemDto,
} from '@chokro/shared';
import type { AdjudicateDecisionInput } from '@chokro/shared';
import { useAdminResource, useAdminAction } from './useAdminResource';

// Worklist row shape is inferred from the Trust Gate response schema, not hand-mirrored.
export type EscalationWorklistItem = EscalationWorklistItemDto;

export const ADMIN_ESCALATIONS_QUERY_KEY = ['admin', 'trust-gate', 'escalations'] as const;

export function useAdminEscalations() {
  return useAdminResource<EscalationsResponse>(
    ADMIN_ESCALATIONS_QUERY_KEY,
    '/api/admin/trust-gate/escalations',
    { schema: EscalationsResponseSchema, refetchInterval: 30_000 },
  );
}

export function useAdjudicateDecision() {
  return useAdminAction<AdjudicationResponse, { id: string; payload: AdjudicateDecisionInput }>({
    path: ({ id }) => `/api/admin/trust-gate/${id}/adjudicate`,
    payload: ({ payload }) => payload,
    schema: AdjudicationResponseSchema,
    invalidate: [ADMIN_ESCALATIONS_QUERY_KEY],
  });
}
