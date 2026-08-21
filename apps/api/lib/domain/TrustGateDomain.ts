// TrustGateDomain: Central verification, anti-fraud decision engine, perceptual hashing, and dynamic thresholds (SPEC 12 / Ticket 08a)
import crypto from 'crypto';
import sharp from 'sharp';
import {
  type Category,
  type TrustSubject,
  type TrustSignalResult,
  type TrustThresholdConfig,
  type EvaluateTrustGateInput,
  DEFAULT_TRUST_THRESHOLDS,
} from '@chokro/shared';
import { trustGateRepo } from '../repos/trustGate';
import { walletRepo } from '../repos/wallet';
import { depositRepo } from '../repos/deposits';
import { disputeRepo } from '../repos/disputes';
import { WalletDomain } from './WalletDomain';
import { ImpactDomain } from './ImpactDomain';

export interface DecisionEvaluationResult {
  decision: 'AUTO_CLEAR' | 'ESCALATE';
  failingSignals: string[];
  evaluatedSignals: Record<string, TrustSignalResult>;
}

export function calculateDistanceMeters(
  loc1: { lat: number; lng: number },
  loc2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth radius in meters
  const lat1 = (loc1.lat * Math.PI) / 180;
  const lat2 = (loc2.lat * Math.PI) / 180;
  const deltaLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const deltaLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function hammingDistance(hex1: string, hex2: string): number {
  if (!hex1 || !hex2) return 64;
  const h1 = hex1.replace(/^0x/, '').toLowerCase();
  const h2 = hex2.replace(/^0x/, '').toLowerCase();
  const len = Math.max(h1.length, h2.length);
  const p1 = h1.padStart(len, '0');
  const p2 = h2.padStart(len, '0');

  let dist = 0;
  for (let i = 0; i < len; i++) {
    const v1 = parseInt(p1[i], 16) || 0;
    const v2 = parseInt(p2[i], 16) || 0;
    let xor = v1 ^ v2;
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

export async function computeDHash(input: Buffer | string): Promise<string> {
  let buffer: Buffer;
  if (typeof input === 'string') {
    if (input.startsWith('data:')) {
      const base64Data = input.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = Buffer.from(input, 'utf-8');
    }
  } else {
    buffer = input;
  }

  try {
    const resized = await sharp(buffer)
      .grayscale()
      .resize(9, 8, { fit: 'fill' })
      .raw()
      .toBuffer();

    let hashBinary = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = resized[row * 9 + col];
        const right = resized[row * 9 + col + 1];
        hashBinary += left > right ? '1' : '0';
      }
    }

    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = hashBinary.slice(i, i + 4);
      hex += parseInt(nibble, 2).toString(16);
    }
    return hex.padStart(16, '0');
  } catch {
    // Deterministic fallback for mock strings / non-image buffers
    return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  }
}

export function isNearDuplicate(hex1: string, hex2: string, maxDistance = 10): boolean {
  return hammingDistance(hex1, hex2) <= maxDistance;
}

export function isAuditSampled(decisionId: string, sampleRate: number): boolean {
  if (sampleRate <= 0) return false;
  if (sampleRate >= 1) return true;
  const hash = crypto.createHash('sha256').update(decisionId).digest('hex').slice(0, 8);
  const val = parseInt(hash, 16);
  const max = 0xffffffff;
  const ratio = val / max;
  return ratio < sampleRate;
}

export class TrustGateDomain {
  /**
   * Pure decision function `evaluate(subject, signals, thresholds) -> Decision`:
   * 1. If subject.category === 'E_WASTE' -> ESCALATE with ['e_waste_mandatory_review']
   * 2. If any signal.available === false -> ESCALATE with unavailable signal names (inverted fallback)
   * 3. If any signal.passed === false -> ESCALATE with failing signal names
   * 4. Otherwise -> AUTO_CLEAR
   */
  static evaluate(
    subject: TrustSubject,
    signals?: Record<string, TrustSignalResult>,
    thresholds?: Partial<TrustThresholdConfig>
  ): DecisionEvaluationResult {
    const effectiveThresholds: TrustThresholdConfig = {
      ...DEFAULT_TRUST_THRESHOLDS,
      ...(thresholds || {}),
    };

    const evaluatedSignals: Record<string, TrustSignalResult> = {};

    // 1. in_app_capture
    if (signals?.in_app_capture) {
      evaluatedSignals.in_app_capture = signals.in_app_capture;
    } else {
      const passed = subject.inAppCaptured !== false;
      evaluatedSignals.in_app_capture = {
        name: 'in_app_capture',
        available: true,
        passed,
        value: subject.inAppCaptured,
        reason: passed ? undefined : 'Evidence was not captured in-app',
      };
    }

    // 2. hash_unique
    if (signals?.hash_unique) {
      evaluatedSignals.hash_unique = signals.hash_unique;
    } else if (subject.evidencePhash !== undefined && subject.evidencePhash !== null) {
      evaluatedSignals.hash_unique = {
        name: 'hash_unique',
        available: true,
        passed: true,
        value: subject.evidencePhash,
      };
    } else {
      // If no photo/phash provided
      evaluatedSignals.hash_unique = {
        name: 'hash_unique',
        available: true,
        passed: true,
        value: null,
      };
    }

    // 3. location_or_session
    if (signals?.location_or_session) {
      evaluatedSignals.location_or_session = signals.location_or_session;
    } else {
      const sessionPassed = subject.isSessionValid === true;
      let locationPassed = false;
      let distMeters: number | null = null;
      if (subject.userLocation && subject.zoneLocation) {
        distMeters = calculateDistanceMeters(subject.userLocation, subject.zoneLocation);
        locationPassed = distMeters <= effectiveThresholds.geofence_radius_meters;
      }
      const passed = sessionPassed || locationPassed;
      evaluatedSignals.location_or_session = {
        name: 'location_or_session',
        available: true,
        passed,
        value: { isSessionValid: sessionPassed, distanceMeters: distMeters },
        reason: passed ? undefined : 'User location is outside geofence and no valid session was provided',
      };
    }

    // 4. category_match
    if (signals?.category_match) {
      evaluatedSignals.category_match = signals.category_match;
    } else {
      if (subject.visionAvailable === false) {
        evaluatedSignals.category_match = {
          name: 'category_match',
          available: false,
          passed: false,
          reason: 'Vision classification service unavailable',
        };
      } else {
        const passed = subject.visionDetectedCategory
          ? subject.visionDetectedCategory === subject.category
          : true;
        evaluatedSignals.category_match = {
          name: 'category_match',
          available: true,
          passed,
          value: { declared: subject.category, detected: subject.visionDetectedCategory },
          reason: passed ? undefined : `Declared category (${subject.category}) does not match vision detection (${subject.visionDetectedCategory})`,
        };
      }
    }

    // 5. quantity_within_band
    if (signals?.quantity_within_band) {
      evaluatedSignals.quantity_within_band = signals.quantity_within_band;
    } else {
      if (
        subject.verifiedQuantity !== undefined &&
        subject.verifiedQuantity !== null &&
        subject.declaredQuantity > 0
      ) {
        const divergenceRatio =
          Math.abs(Number(subject.declaredQuantity) - Number(subject.verifiedQuantity)) /
          Number(subject.declaredQuantity);
        const passed = divergenceRatio <= effectiveThresholds.max_quantity_divergence_ratio;
        evaluatedSignals.quantity_within_band = {
          name: 'quantity_within_band',
          available: true,
          passed,
          value: {
            declared: subject.declaredQuantity,
            verified: subject.verifiedQuantity,
            divergenceRatio,
          },
          reason: passed
            ? undefined
            : `Quantity divergence (${(divergenceRatio * 100).toFixed(1)}%) exceeds threshold (${(effectiveThresholds.max_quantity_divergence_ratio * 100).toFixed(1)}%)`,
        };
      } else {
        evaluatedSignals.quantity_within_band = {
          name: 'quantity_within_band',
          available: true,
          passed: true,
          value: { declared: subject.declaredQuantity },
        };
      }
    }

    // 6. user_velocity
    if (signals?.user_velocity) {
      evaluatedSignals.user_velocity = signals.user_velocity;
    } else {
      const depositsOk = (subject.userDailyDepositCount ?? 0) <= effectiveThresholds.max_user_daily_deposits;
      const creditOk = (subject.userDailyCreditBdt ?? 0) <= effectiveThresholds.max_user_daily_credits_bdt;
      const passed = depositsOk && creditOk;
      evaluatedSignals.user_velocity = {
        name: 'user_velocity',
        available: true,
        passed,
        value: {
          dailyDeposits: subject.userDailyDepositCount ?? 0,
          dailyCreditBdt: subject.userDailyCreditBdt ?? 0,
        },
        reason: passed ? undefined : 'User daily velocity cap exceeded',
      };
    }

    // 7. partner_velocity
    if (signals?.partner_velocity) {
      evaluatedSignals.partner_velocity = signals.partner_velocity;
    } else {
      const passed =
        (subject.partnerDailyConfirmationCount ?? 0) <=
        effectiveThresholds.max_partner_daily_confirmations;
      evaluatedSignals.partner_velocity = {
        name: 'partner_velocity',
        available: true,
        passed,
        value: { dailyConfirmations: subject.partnerDailyConfirmationCount ?? 0 },
        reason: passed ? undefined : 'Partner daily confirmation cap exceeded',
      };
    }

    // 8. pair_history
    if (signals?.pair_history) {
      evaluatedSignals.pair_history = signals.pair_history;
    } else {
      const passed =
        (subject.pairDailyInteractionCount ?? 0) <=
        effectiveThresholds.max_pair_daily_interactions;
      evaluatedSignals.pair_history = {
        name: 'pair_history',
        available: true,
        passed,
        value: { pairDailyInteractions: subject.pairDailyInteractionCount ?? 0 },
        reason: passed ? undefined : 'Repeated user-partner interaction cap exceeded',
      };
    }

    // 9. account_age
    if (signals?.account_age) {
      evaluatedSignals.account_age = signals.account_age;
    } else {
      let passed = true;
      let ageHours: number | null = null;
      if (
        (subject.estimatedBdt ?? 0) >= effectiveThresholds.large_claim_threshold_bdt &&
        subject.accountCreatedAt
      ) {
        const createdMs = new Date(subject.accountCreatedAt).getTime();
        ageHours = (Date.now() - createdMs) / (1000 * 60 * 60);
        passed = ageHours >= effectiveThresholds.min_account_age_hours_for_large_claim;
      }
      evaluatedSignals.account_age = {
        name: 'account_age',
        available: true,
        passed,
        value: { ageHours, estimatedBdt: subject.estimatedBdt },
        reason: passed ? undefined : 'New account making large credit claim requires human review',
      };
    }

    // 10. flag_count
    if (signals?.flag_count) {
      evaluatedSignals.flag_count = signals.flag_count;
    } else {
      const passed =
        (subject.activeFraudFlagCount ?? 0) <= effectiveThresholds.max_active_fraud_flags;
      evaluatedSignals.flag_count = {
        name: 'flag_count',
        available: true,
        passed,
        value: { activeFlags: subject.activeFraudFlagCount ?? 0 },
        reason: passed ? undefined : 'Active fraud flags exceed maximum allowed threshold',
      };
    }

    // Conjunction evaluation
    const failingSignals: string[] = [];

    // E_WASTE mandatory review rule
    if (subject.category === 'E_WASTE') {
      failingSignals.push('e_waste_mandatory_review');
    }

    for (const [name, sig] of Object.entries(evaluatedSignals)) {
      if (sig.available === false) {
        failingSignals.push(name);
      } else if (sig.passed === false) {
        failingSignals.push(name);
      }
    }

    const uniqueFailing = Array.from(new Set(failingSignals));
    const decision = uniqueFailing.length === 0 ? 'AUTO_CLEAR' : 'ESCALATE';

    return {
      decision,
      failingSignals: uniqueFailing,
      evaluatedSignals,
    };
  }

  /**
   * Fetches active thresholds from DB or returns default
   */
  static async getEffectiveThresholds(): Promise<{
    config: TrustThresholdConfig;
    configId?: string;
  }> {
    const record = await trustGateRepo.getActiveThresholdConfig();
    if (record && record.config_json) {
      return {
        config: {
          ...DEFAULT_TRUST_THRESHOLDS,
          ...(record.config_json as Partial<TrustThresholdConfig>),
        },
        configId: record.id,
      };
    }
    return {
      config: DEFAULT_TRUST_THRESHOLDS,
    };
  }

  /**
   * Updates dynamic threshold configurations (Admin operation)
   */
  static async updateThresholds(
    newConfig: Partial<TrustThresholdConfig>,
    updatedBy?: string | null
  ) {
    const current = await this.getEffectiveThresholds();
    const merged: TrustThresholdConfig = {
      ...current.config,
      ...newConfig,
    };
    const created = await trustGateRepo.createThresholdConfig(merged, updatedBy);
    return created;
  }

  /**
   * Evaluates a subject, persists the decision, applies state transitions,
   * updates credit transactions from PENDING -> VERIFIED, and manages fraud flags.
   */
  static async evaluateAndApply(
    input: EvaluateTrustGateInput,
    caller?: { userId?: string; role?: string }
  ) {
    const { config: thresholds, configId: thresholdConfigId } =
      await this.getEffectiveThresholds();

    // Check perceptual hash for duplicates if provided
    let hashUniqueSignal: TrustSignalResult | undefined = undefined;
    let computedPhash = input.evidencePhash || null;

    if (input.evidenceUrl && !computedPhash) {
      // In a real environment, might fetch and compute dHash; here we compute or handle
      computedPhash = await computeDHash(input.evidenceUrl);
    }

    if (computedPhash) {
      const existingHashes = await trustGateRepo.findEvidenceHashes(200);
      let duplicateFound = false;
      let matchedUrl = '';
      for (const h of existingHashes) {
        if (h.evidence_url !== input.evidenceUrl) {
          const dist = hammingDistance(computedPhash, h.phash_hex);
          if (dist <= thresholds.max_photo_hamming_distance) {
            duplicateFound = true;
            matchedUrl = h.evidence_url;
            break;
          }
        }
      }

      hashUniqueSignal = {
        name: 'hash_unique',
        available: true,
        passed: !duplicateFound,
        value: { phash: computedPhash, matchedUrl: duplicateFound ? matchedUrl : null },
        reason: duplicateFound
          ? 'Duplicate or near-duplicate evidence photo detected'
          : undefined,
      };
    }

    // Active fraud flags count if not supplied
    let activeFraudCount = input.activeFraudFlagCount;
    if (activeFraudCount === undefined) {
      activeFraudCount = await trustGateRepo.countActiveFraudFlags('USER', input.userId);
    }

    const subject: TrustSubject = {
      ...input,
      subjectType: input.subjectType ?? 'DEPOSIT',
      category: input.category ?? 'PLASTICS',
      declaredQuantity: input.declaredQuantity ?? 0,
      unit: input.unit ?? 'kg',
      evidencePhash: computedPhash || undefined,
      activeFraudFlagCount: activeFraudCount,
    };

    const combinedSignals = {
      ...(input.signals || {}),
      ...(hashUniqueSignal ? { hash_unique: hashUniqueSignal } : {}),
    };

    // Run pure evaluation
    const evaluation = this.evaluate(subject, combinedSignals, thresholds);

    // Cross-cutting check: an open dispute on a pickup/deposit/lot pauses verification
    const openDispute = await disputeRepo.findOpenBySource(input.subjectType ?? 'DEPOSIT', input.subjectId);
    if (openDispute) {
      evaluation.decision = 'ESCALATE';
      if (!evaluation.failingSignals.includes('open_dispute_pause')) {
        evaluation.failingSignals.push('open_dispute_pause');
      }
    }

    // Persist Decision
    const decisionRecord = await trustGateRepo.createDecision({
      subject_type: input.subjectType ?? 'DEPOSIT',
      subject_id: input.subjectId,
      decision: evaluation.decision,
      failing_signals: evaluation.failingSignals,
      evaluated_signals: evaluation.evaluatedSignals,
      threshold_config_id: thresholdConfigId || null,
      decided_by: caller?.userId || 'SYSTEM',
      notes: evaluation.decision === 'AUTO_CLEAR' ? 'Auto-cleared by Trust Gate' : `Escalated: ${evaluation.failingSignals.join(', ')}`,
    });

    const isSampled = isAuditSampled(decisionRecord.id, thresholds.audit_sample_rate);

    let creditTxn = null;

    if (evaluation.decision === 'AUTO_CLEAR') {
      // Flip PENDING credit to VERIFIED with trust_decision_id
      if (input.creditTxnId || input.custodyRef) {
        creditTxn = await walletRepo.verifyCreditTransaction({
          id: input.creditTxnId || undefined,
          custodyRef: input.custodyRef || undefined,
          trustDecisionId: decisionRecord.id,
          amount: input.verifiedQuantity ? undefined : undefined,
        });

        if (creditTxn) {
          await WalletDomain.onCreditsVerified(input.userId);
        }
      }

      // Update deposit status to VERIFIED if deposit
      if (input.subjectType === 'DEPOSIT') {
        const deposit = await depositRepo.findDepositById(input.subjectId);
        if (deposit && deposit.status === 'RECORDED') {
          await depositRepo.updateDepositVerification(
            input.subjectId,
            deposit.verified_quantity || deposit.declared_quantity,
            deposit.verified_bdt || deposit.estimated_bdt,
            deposit.divergence_ratio || 0,
            'VERIFIED'
          );
        }
      }

      // Record verified impact
      try {
        await ImpactDomain.recordVerifiedImpact({
          custodyType: input.subjectType ?? 'DEPOSIT',
          custodyId: input.subjectId,
          trustDecisionId: decisionRecord.id,
          userId: input.userId,
          category: input.category ?? 'PLASTICS',
          declaredQuantity: input.declaredQuantity ?? 0,
          verifiedQuantity: input.verifiedQuantity,
          unit: input.unit ?? 'kg',
        });
      } catch (err) {
        console.error('Failed to record verified impact on auto-clear:', err);
      }
    } else {
      // Escalated
      if (input.subjectType === 'DEPOSIT') {
        const deposit = await depositRepo.findDepositById(input.subjectId);
        if (deposit && deposit.status === 'RECORDED') {
          await depositRepo.updateDepositVerification(
            input.subjectId,
            deposit.verified_quantity || deposit.declared_quantity,
            deposit.verified_bdt || deposit.estimated_bdt,
            deposit.divergence_ratio || 0,
            'ESCALATED'
          );
        }
      }

      // If failing signals include fraud markers, record fraud flags
      for (const failing of evaluation.failingSignals) {
        if (failing === 'hash_unique') {
          await trustGateRepo.createFraudFlag({
            entity_type: 'USER',
            entity_id: input.userId,
            flag_type: 'DUPLICATE_PHOTO',
            reason: 'Submitted duplicate or near-duplicate evidence photo',
            severity: 'HIGH',
          });
        } else if (failing === 'quantity_within_band') {
          await trustGateRepo.createFraudFlag({
            entity_type: 'USER',
            entity_id: input.userId,
            flag_type: 'QUANTITY_DIVERGENCE',
            reason: 'High divergence between declared and verified mass',
            severity: 'MEDIUM',
          });
        }
      }
    }

    // Persist evidence hash if new
    if (computedPhash && input.evidenceUrl) {
      await trustGateRepo.createEvidenceHash({
        evidence_url: input.evidenceUrl,
        phash_hex: computedPhash,
        uploader_id: input.userId,
      });
    }

    return {
      decision: evaluation.decision,
      trustDecisionId: decisionRecord.id,
      failingSignals: evaluation.failingSignals,
      evaluatedSignals: evaluation.evaluatedSignals,
      isAuditSampled: isSampled,
      creditStatus: evaluation.decision === 'AUTO_CLEAR' ? 'VERIFIED' : 'PENDING',
      creditTxn,
      decisionRecord,
    };
  }
}
