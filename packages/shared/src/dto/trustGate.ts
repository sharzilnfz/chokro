// DTOs and types for Trust Gate verification decisions, perceptual hashing, and dynamic thresholds (SPEC 12 / Ticket 08a)
import { z } from 'zod';
import { CategoryEnum, type Category, type Unit } from '../enums';

// Possible decisions emitted by the Trust Gate
export const TrustGateDecisionEnum = z.enum(['AUTO_CLEAR', 'ESCALATE']);
export type TrustGateDecision = z.infer<typeof TrustGateDecisionEnum>;

// Supported trust signal identifiers
export const TrustSignalNameEnum = z.enum([
  'in_app_capture',
  'hash_unique',
  'location_or_session',
  'category_match',
  'quantity_within_band',
  'user_velocity',
  'partner_velocity',
  'pair_history',
  'account_age',
  'flag_count',
]);
export type TrustSignalName = z.infer<typeof TrustSignalNameEnum>;

// Severity levels for fraud flags
export const FraudSeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type FraudSeverity = z.infer<typeof FraudSeverityEnum>;

// Individual evaluated signal outcome
export interface TrustSignalResult {
  name?: string;
  available: boolean;
  passed: boolean;
  value?: any;
  reason?: string;
}

// Subject descriptor passed into the trust gate evaluator
export interface TrustSubject {
  subjectType: 'DEPOSIT' | 'PICKUP' | 'MANUAL' | string;
  subjectId: string;
  userId: string;
  partnerId?: string | null;
  category: Category | string;
  declaredQuantity: number;
  verifiedQuantity?: number | null;
  unit: Unit | string;
  evidenceUrl?: string | null;
  evidencePhash?: string | null;
  inAppCaptured?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  zoneLocation?: { lat: number; lng: number } | null;
  isSessionValid?: boolean;
  userDailyDepositCount?: number;
  userDailyCreditBdt?: number;
  partnerDailyConfirmationCount?: number;
  pairDailyInteractionCount?: number;
  accountCreatedAt?: string | Date;
  estimatedBdt?: number;
  activeFraudFlagCount?: number;
  visionDetectedCategory?: Category | string | null;
  visionAvailable?: boolean;
  creditTxnId?: string | null;
  custodyRef?: string | null;
}

// Dynamic threshold configuration parameters
export interface TrustThresholdConfig {
  max_photo_hamming_distance: number;
  max_quantity_divergence_ratio: number;
  geofence_radius_meters: number;
  max_user_daily_deposits: number;
  max_user_daily_credits_bdt: number;
  max_partner_daily_confirmations: number;
  max_pair_daily_interactions: number;
  min_account_age_hours_for_large_claim: number;
  large_claim_threshold_bdt: number;
  max_active_fraud_flags: number;
  audit_sample_rate: number;
}

// Default baseline thresholds
export const DEFAULT_TRUST_THRESHOLDS: TrustThresholdConfig = {
  max_photo_hamming_distance: 10,
  max_quantity_divergence_ratio: 0.25,
  geofence_radius_meters: 200,
  max_user_daily_deposits: 10,
  max_user_daily_credits_bdt: 5000,
  max_partner_daily_confirmations: 50,
  max_pair_daily_interactions: 5,
  min_account_age_hours_for_large_claim: 24,
  large_claim_threshold_bdt: 1000,
  max_active_fraud_flags: 2,
  audit_sample_rate: 0.05,
};

// API Schema: Evaluate Trust Gate — public route accepts only subject reference; all signals/flags are server-derived.
// Extra fields if supplied are stripped/ignored (trust bypass fix). Internal domain callers use EvaluateTrustGateDomainInput.
export const EvaluateTrustGateSchema = z.object({
  subjectType: z.enum(['DEPOSIT', 'PICKUP', 'MANUAL', 'REDEMPTION']).default('DEPOSIT'),
  subjectId: z.string().uuid(),
});

export type EvaluateTrustGateInput = z.input<typeof EvaluateTrustGateSchema>;

// Internal domain input — server-assembled bundle (not exposed via HTTP)
export const EvaluateTrustGateDomainSchema = z.object({
  subjectType: z.enum(['DEPOSIT', 'PICKUP', 'MANUAL', 'REDEMPTION']).default('DEPOSIT'),
  subjectId: z.string().uuid(),
  userId: z.string().uuid(),
  partnerId: z.string().uuid().optional().nullable(),
  category: CategoryEnum.optional(),
  declaredQuantity: z.number().positive().optional(),
  verifiedQuantity: z.number().positive().optional().nullable(),
  unit: z.enum(['kg', 'piece']).optional(),
  evidenceUrl: z.string().optional().nullable(),
  evidencePhash: z.string().optional().nullable(),
  inAppCaptured: z.boolean().optional().default(true),
  userLocation: z.object({ lat: z.number(), lng: z.number() }).optional().nullable(),
  zoneLocation: z.object({ lat: z.number(), lng: z.number() }).optional().nullable(),
  isSessionValid: z.boolean().optional().default(false),
  userDailyDepositCount: z.number().int().min(0).optional(),
  userDailyCreditBdt: z.number().min(0).optional(),
  partnerDailyConfirmationCount: z.number().int().min(0).optional(),
  pairDailyInteractionCount: z.number().int().min(0).optional(),
  accountCreatedAt: z.union([z.string(), z.date()]).optional(),
  estimatedBdt: z.number().min(0).optional(),
  visionDetectedCategory: CategoryEnum.optional().nullable(),
  visionAvailable: z.boolean().optional().default(true),
  creditTxnId: z.string().uuid().optional().nullable(),
  custodyRef: z.string().optional().nullable(),
});

export type EvaluateTrustGateDomainInput = z.input<typeof EvaluateTrustGateDomainSchema>;

// API Schema: Update Dynamic Thresholds
export const UpdateThresholdsSchema = z.object({
  max_photo_hamming_distance: z.number().int().min(0).max(64).optional(),
  max_quantity_divergence_ratio: z.number().min(0).max(1).optional(),
  geofence_radius_meters: z.number().min(0).optional(),
  max_user_daily_deposits: z.number().int().min(1).optional(),
  max_user_daily_credits_bdt: z.number().min(0).optional(),
  max_partner_daily_confirmations: z.number().int().min(1).optional(),
  max_pair_daily_interactions: z.number().int().min(1).optional(),
  min_account_age_hours_for_large_claim: z.number().min(0).optional(),
  large_claim_threshold_bdt: z.number().min(0).optional(),
  max_active_fraud_flags: z.number().int().min(0).optional(),
  audit_sample_rate: z.number().min(0).max(1).optional(),
});

export type UpdateThresholdsInput = z.infer<typeof UpdateThresholdsSchema>;
