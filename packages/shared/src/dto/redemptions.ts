// DTOs and validation schemas for Green Wallet Redemption, Liability Caps & MFS Payouts (SPEC 13 / Ticket 09a)
import { z } from 'zod';

export const PayoutChannelEnum = z.enum(['BKASH', 'NAGAD', 'ROCKET', 'UPAY']);
export type PayoutChannel = z.infer<typeof PayoutChannelEnum>;

export const RedemptionStatusEnum = z.enum([
  'REQUESTED',
  'AUTO_APPROVED',
  'ESCALATED',
  'APPROVED',
  'PAID',
  'REJECTED',
  'CANCELLED',
  'FAILED',
]);
export type RedemptionStatus = z.infer<typeof RedemptionStatusEnum>;

export const PayoutStatusEnum = z.enum(['SUCCESS', 'FAILED', 'PENDING', 'SIMULATED']);
export type PayoutStatus = z.infer<typeof PayoutStatusEnum>;

export const DEFAULT_LIABILITY_CAPS = {
  monthly_platform_cap_bdt: 100000.0,
  monthly_user_cap_bdt: 5000.0,
  min_redemption_bdt: 50.0,
  fee_percentage: 1.85,
};

export const CreateRedemptionSchema = z.object({
  amountCredits: z.number().positive('Redemption amount must be greater than zero').finite(),
  payoutChannel: PayoutChannelEnum,
  accountNumber: z
    .string()
    .min(11, 'Account number must be at least 11 digits')
    .max(20, 'Account number cannot exceed 20 characters')
    .regex(/^01[3-9]\d{8}$/, 'Valid Bangladeshi mobile number required (01XXXXXXXXX)'),
});
export type CreateRedemptionInput = z.infer<typeof CreateRedemptionSchema>;

export const SettleRedemptionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'RETRY']),
  reason: z.string().optional().nullable(),
});
export type SettleRedemptionInput = z.infer<typeof SettleRedemptionSchema>;

export const CancelRedemptionSchema = z.object({
  reason: z.string().optional().nullable(),
});
export type CancelRedemptionInput = z.infer<typeof CancelRedemptionSchema>;

export const UpdateLiabilityCapSchema = z.object({
  monthlyPlatformCapBdt: z.number().positive('Monthly platform cap must be positive'),
  monthlyUserCapBdt: z.number().positive('Monthly user cap must be positive'),
  minRedemptionBdt: z.number().positive('Minimum redemption must be positive'),
  feePercentage: z.number().min(0).max(100, 'Fee percentage must be between 0 and 100'),
});
export type UpdateLiabilityCapInput = z.infer<typeof UpdateLiabilityCapSchema>;

export interface LiabilityCapConfig {
  id?: string;
  monthly_platform_cap_bdt: number;
  monthly_user_cap_bdt: number;
  min_redemption_bdt: number;
  fee_percentage: number;
  effective_from?: Date | string;
  updated_by?: string | null;
  created_at?: Date | string;
}

export interface RedemptionQuote {
  grossAmountBdt: number;
  feePercentage: number;
  feeBdt: number;
  netAmountBdt: number;
  minRedemptionBdt: number;
  monthlyUserCapBdt: number;
  monthlyUserRemainingBdt: number;
  verifiedBalanceBdt: number;
}

export interface LiabilitySummary {
  totalEarnedVerifiedCredits: number;
  totalRedeemedCredits: number;
  outstandingLiabilityBdt: number;
  currentMonthRedeemedBdt: number;
  monthlyPlatformCapBdt: number;
  monthlyCapRemainingBdt: number;
  monthlyRunRateRatio: number;
  capAlertTriggered: boolean;
}

export interface RedemptionRequestRecord {
  id: string;
  user_id: string;
  amount_credits: string | number;
  payout_channel: string;
  account_number: string;
  gross_amount_bdt: string | number;
  fee_bdt: string | number;
  net_amount_bdt: string | number;
  status: RedemptionStatus;
  trust_decision_id?: string | null;
  created_at: Date | string;
  user?: {
    id: string;
    email: string;
    full_name?: string | null;
    phone?: string | null;
  } | null;
  payout?: PayoutRecord | null;
  trust_decision?: {
    id: string;
    decision: string;
    failing_signals: string[];
    evaluated_signals: Record<string, any>;
    notes?: string | null;
  } | null;
}

export interface PayoutRecord {
  id: string;
  redemption_id: string;
  gateway_ref?: string | null;
  gateway_provider: string;
  status: PayoutStatus;
  payload?: Record<string, any> | null;
  created_at: Date | string;
}
