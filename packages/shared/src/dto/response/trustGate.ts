// Response DTOs for the Trust Gate admin surface (A07/A08): escalation worklist bundles,
// adjudication outcomes, and dynamic threshold configuration/history envelopes.
import { z } from 'zod';

// One fraud flag attached to a user or partner inside an escalated bundle.
export const FraudFlagDtoSchema = z.object({
  id: z.string(),
  flag_type: z.string(),
  reason: z.string(),
  severity: z.string(),
  is_cleared: z.boolean(),
  created_at: z.union([z.string(), z.date()]),
});
export type FraudFlagDto = z.infer<typeof FraudFlagDtoSchema>;

// Subject snapshot embedded in an escalated decision (deposit or pickup projection).
export const EscalationSubjectSchema = z.object({
  category: z.string().optional(),
  declared_quantity: z.union([z.number(), z.string()]).optional(),
  verified_quantity: z.union([z.number(), z.string()]).optional(),
  unit: z.string().optional(),
  evidence_url: z.string().nullable().optional(),
  user_id: z.string().optional(),
  partner_id: z.string().nullable().optional(),
  address: z.string().optional(),
  status: z.string().optional(),
});
export type EscalationSubject = z.infer<typeof EscalationSubjectSchema>;

// One-time user appeal attached to an escalated decision.
export const DecisionContestDtoSchema = z.object({
  id: z.string(),
  reason: z.string(),
  status: z.string(),
  user_id: z.string(),
  created_at: z.union([z.string(), z.date()]),
});
export type DecisionContestDto = z.infer<typeof DecisionContestDtoSchema>;

// One row of the admin escalation worklist as returned by GET /api/admin/trust-gate/escalations.
export const EscalationWorklistItemSchema = z.object({
  id: z.string(),
  subject_type: z.string(),
  subject_id: z.string(),
  decision: z.string(),
  failing_signals: z.array(z.string()),
  evaluated_signals: z.record(z.string(), z.any()),
  threshold_config_id: z.string().nullable().optional(),
  decided_by: z.string(),
  decided_at: z.union([z.string(), z.date()]),
  notes: z.string().nullable().optional(),
  created_at: z.union([z.string(), z.date()]),
  is_contested: z.boolean(),
  contest: DecisionContestDtoSchema.nullable().optional(),
  subject: EscalationSubjectSchema.nullable().optional(),
  user_flags: z.array(FraudFlagDtoSchema).optional(),
  partner_flags: z.array(FraudFlagDtoSchema).optional(),
});
export type EscalationWorklistItemDto = z.infer<typeof EscalationWorklistItemSchema>;

// Envelope for GET /api/admin/trust-gate/escalations.
export const EscalationsResponseSchema = z.object({
  escalations: z.array(EscalationWorklistItemSchema),
  count: z.number(),
});
export type EscalationsResponse = z.infer<typeof EscalationsResponseSchema>;

// Envelope for POST /api/admin/trust-gate/[id]/adjudicate (apiSuccess merges message + result).
export const AdjudicationResponseSchema = z.object({
  message: z.string().optional(),
  success: z.boolean(),
  action: z.string(),
  decisionId: z.string(),
  creditTxn: z.unknown().optional(),
  reason: z.string().nullable().optional(),
});
export type AdjudicationResponse = z.infer<typeof AdjudicationResponseSchema>;

// Dynamic threshold configuration knobs (same numeric fields as the request-side config).
export const TrustThresholdConfigSchema = z.object({
  max_photo_hamming_distance: z.number(),
  max_quantity_divergence_ratio: z.number(),
  geofence_radius_meters: z.number(),
  max_user_daily_deposits: z.number(),
  max_user_daily_credits_bdt: z.number(),
  max_partner_daily_confirmations: z.number(),
  max_pair_daily_interactions: z.number(),
  min_account_age_hours_for_large_claim: z.number(),
  large_claim_threshold_bdt: z.number(),
  max_active_fraud_flags: z.number(),
  audit_sample_rate: z.number(),
});
export type TrustGateThresholdConfig = z.infer<typeof TrustThresholdConfigSchema>;

// One audit-history row of threshold changes (trust_threshold_configs projection).
export const ThresholdHistoryEntrySchema = z.object({
  id: z.string(),
  config_json: TrustThresholdConfigSchema.partial(),
  effective_from: z.union([z.string(), z.date()]),
  updated_by: z.string().nullable().optional(),
  created_at: z.union([z.string(), z.date()]),
});
export type ThresholdHistoryEntry = z.infer<typeof ThresholdHistoryEntrySchema>;

// Envelope for GET /api/admin/trust-gate/thresholds.
export const ThresholdsResponseSchema = z.object({
  thresholds: TrustThresholdConfigSchema,
  configId: z.string().optional(),
  history: z.array(ThresholdHistoryEntrySchema),
});
export type ThresholdsResponse = z.infer<typeof ThresholdsResponseSchema>;

// Envelope for PUT /api/admin/trust-gate/thresholds.
export const ThresholdUpdateResponseSchema = z.object({
  message: z.string().optional(),
  thresholds: TrustThresholdConfigSchema,
  configId: z.string().optional(),
  record: ThresholdHistoryEntrySchema.optional(),
});
export type ThresholdUpdateResponse = z.infer<typeof ThresholdUpdateResponseSchema>;
