// DTOs and validation schemas for Custody Handover OTP, Admin Escalation Worklist, and Decision Contests (SPEC 12 / Ticket 08b)
import { z } from 'zod';

// Handover lifecycle statuses
export const HandoverStatusEnum = z.enum(['PENDING', 'CONFIRMED', 'EXPIRED', 'FAILED']);
export type HandoverStatus = z.infer<typeof HandoverStatusEnum>;

// Decision Contest statuses (Appeal workflow)
export const DecisionContestStatusEnum = z.enum(['PENDING', 'UPHELD', 'OVERTURNED']);
export type DecisionContestStatus = z.infer<typeof DecisionContestStatusEnum>;

// API Schema: Generate Handover Challenge OTP
export const GenerateHandoverSchema = z.object({
  taskId: z.string().uuid(),
});
export type GenerateHandoverInput = z.infer<typeof GenerateHandoverSchema>;

// API Schema: Verify Handover OTP
export const VerifyOtpSchema = z.object({
  taskId: z.string().uuid(),
  otpCode: z.string().length(6, 'OTP code must be exactly 6 digits'),
  verifiedQuantity: z.number().positive().optional().nullable(),
  verifiedCondition: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

// API Schema: Admin Adjudication
export const AdjudicateDecisionSchema = z.object({
  action: z.enum(['VERIFY', 'REJECT']),
  reason: z.string().optional().nullable(),
});
export type AdjudicateDecisionInput = z.infer<typeof AdjudicateDecisionSchema>;

// API Schema: User Decision Contest (One-time appeal)
export const ContestDecisionSchema = z.object({
  decisionId: z.string().uuid(),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});
export type ContestDecisionInput = z.infer<typeof ContestDecisionSchema>;

// Data interfaces
export interface CustodyHandoverRecord {
  id: string;
  task_id: string;
  otp_code_hash: string;
  giver_user_id: string;
  collector_partner_id: string;
  status: HandoverStatus;
  expires_at: Date | string;
  confirmed_at?: Date | string | null;
  created_at: Date | string;
}

export interface DecisionContestRecord {
  id: string;
  decision_id: string;
  user_id: string;
  reason: string;
  status: DecisionContestStatus;
  reviewed_by?: string | null;
  reviewed_at?: Date | string | null;
  created_at: Date | string;
}

export interface EscalationWorklistItem {
  id: string;
  subject_type: string;
  subject_id: string;
  decision: string;
  failing_signals: string[];
  evaluated_signals: Record<string, any>;
  threshold_config_id?: string | null;
  decided_by: string;
  decided_at: Date | string;
  notes?: string | null;
  created_at: Date | string;
  is_contested: boolean;
  contest?: {
    id: string;
    reason: string;
    status: string;
    user_id: string;
    created_at: Date | string;
  } | null;
  subject?: {
    category?: string;
    declared_quantity?: number | string;
    verified_quantity?: number | string;
    unit?: string;
    evidence_url?: string | null;
    user_id?: string;
    partner_id?: string | null;
    address?: string;
    status?: string;
  } | null;
  user_flags?: Array<{
    id: string;
    flag_type: string;
    reason: string;
    severity: string;
    is_cleared: boolean;
    created_at: Date | string;
  }>;
  partner_flags?: Array<{
    id: string;
    flag_type: string;
    reason: string;
    severity: string;
    is_cleared: boolean;
    created_at: Date | string;
  }>;
}
