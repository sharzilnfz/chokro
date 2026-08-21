// CreditVerificationDomain: single owner for the pending→verified flip (C1).
// Balance classification lives in LedgerMath; this module owns custody-ref codec, dispute-pause, verify/reject/compensate tails, and mintPending.
import { walletRepo } from '../repos/wallet';
import { trustGateRepo } from '../repos/trustGate';
import { depositRepo } from '../repos/deposits';
import { pickupRepo } from '../repos/pickups';
import { disputeRepo } from '../repos/disputes';
import { db, creditTxns, eq, and } from '@chokro/db';
import { WalletDomain } from './WalletDomain';
import { ImpactDomain } from './ImpactDomain';
import { TrustGateDomain } from './TrustGateDomain';
import { DomainRuleError } from '../database';

// A drizzle query executor for in-transaction flips: an open transaction (tx).
type TxExecutor = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ---------------------------------------------------------------------------
// Custody-ref codec — one format, parsed, never string-concatenated at call sites.
// ---------------------------------------------------------------------------
export type CustodyKind = 'DEPOSIT' | 'PICKUP' | 'REDEMPTION';

const CUSTODY_DEP_PREFIX = 'CUSTODY-DEP-';
const CUSTODY_PICKUP_PREFIX = 'CUSTODY-PICKUP-';
const REDEMPTION_PREFIX = 'REDEMPTION-';

// UUID v4 shape (8-4-4-4-12 hex). Accept lenient for legacy but validate on encode.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RAW_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCustodyRef(kind: CustodyKind, id: string): string {
  if (!UUID_RE.test(id)) throw new DomainRuleError(`Invalid custody id: ${id}`, 400);
  if (kind === 'DEPOSIT') return `${CUSTODY_DEP_PREFIX}${id}`;
  if (kind === 'PICKUP') return `${CUSTODY_PICKUP_PREFIX}${id}`;
  return `${REDEMPTION_PREFIX}${id}`;
}

export function decodeCustodyRef(ref: string): { kind: CustodyKind; id: string } | null {
  if (ref.startsWith(CUSTODY_DEP_PREFIX)) {
    const id = ref.slice(CUSTODY_DEP_PREFIX.length);
    if (UUID_RE.test(id)) return { kind: 'DEPOSIT', id };
    return null;
  }
  if (ref.startsWith(CUSTODY_PICKUP_PREFIX)) {
    const id = ref.slice(CUSTODY_PICKUP_PREFIX.length);
    if (UUID_RE.test(id)) return { kind: 'PICKUP', id };
    return null;
  }
  if (ref.startsWith(REDEMPTION_PREFIX)) {
    const id = ref.slice(REDEMPTION_PREFIX.length);
    // redemption refs may include suffix like REDEMPTION-RETRY-... we treat those as not custody for pending->verified; decode returns null for those.
    if (UUID_RE.test(id)) return { kind: 'REDEMPTION', id };
    return null;
  }
  // Legacy deposit raw UUID — decode as DEPOSIT
  if (RAW_UUID_RE.test(ref)) return { kind: 'DEPOSIT', id: ref };
  return null;
}

export function matchesCustodyRef(storedRef: string | null | undefined, kind: CustodyKind, id: string): boolean {
  if (!storedRef) return false;
  const canonical = encodeCustodyRef(kind, id);
  if (storedRef === canonical) return true;
  // Backfill: legacy deposit rows stored raw UUID
  if (kind === 'DEPOSIT' && storedRef === id) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------
export const CreditVerificationDomain = {
  // Codec helpers exposed for tests
  encodeCustodyRef,
  decodeCustodyRef,
  matchesCustodyRef,

  async checkDisputePause(subjectType: string, subjectId: string): Promise<boolean> {
    const open = await disputeRepo.findOpenBySource(subjectType, subjectId);
    return !!open;
  },

  async assertNoOpenDispute(subjectType: string, subjectId: string): Promise<void> {
    const has = await this.checkDisputePause(subjectType, subjectId);
    if (has) throw new DomainRuleError(`Cannot verify credits while an open dispute is active on this ${subjectType.toLowerCase()}`, 409);
  },

  async mintPending(params: {
    userId: string;
    amount: number | string;
    kind: CustodyKind;
    subjectId: string;
    rateCardEntryId?: string | null;
    reason?: string | null;
  }) {
    const custodyRef = encodeCustodyRef(params.kind, params.subjectId);
    const credit = await walletRepo.createEarnTransaction({
      userId: params.userId,
      amount: params.amount,
      custodyRef,
      rateCardEntryId: params.rateCardEntryId || null,
      reason: params.reason || null,
      status: 'PENDING',
    });
    return credit;
  },

  // Internal: find pending credit by custody (with legacy fallback)
  async findPendingByCustody(kind: CustodyKind, subjectId: string) {
    const canonical = encodeCustodyRef(kind, subjectId);
    let credit = await walletRepo.findByCustodyRef(canonical);
    if (credit && credit.status === 'PENDING') return credit;
    if (kind === 'DEPOSIT') {
      // legacy raw UUID
      const legacy = await walletRepo.findByCustodyRef(subjectId);
      if (legacy && legacy.status === 'PENDING') return legacy;
    }
    // Also try lookup by id if custodyRef missed but we have credit id stored elsewhere? Fallback: search by id is caller's responsibility.
    if (credit && credit.status !== 'PENDING') {
      // if canonical exists but not pending, still check legacy
      if (kind === 'DEPOSIT') {
        const legacy = await walletRepo.findByCustodyRef(subjectId);
        if (legacy && legacy.status === 'PENDING') return legacy;
      }
      return null;
    }
    return credit && credit.status === 'PENDING' ? credit : null;
  },

  // In-transaction entry point (settlement crash-window fix): performs ONLY the
  // ledger status flip PENDING->VERIFIED using the CALLER'S executor — never the
  // global withDb(db) seam (PGlite single connection would deadlock) and none of
  // the impact/streak/badge tails. The public verify() keeps the full behaviour.
  async verifyWithin(
    executor: TxExecutor,
    input: { redemptionId: string; trustDecisionId?: string | null }
  ) {
    const custodyRef = encodeCustodyRef('REDEMPTION', input.redemptionId);
    const [flipped] = await executor
      .update(creditTxns)
      .set({
        status: 'VERIFIED',
        // UUID column: no decision (legacy fallback) stores NULL, not ''
        trust_decision_id: input.trustDecisionId || null,
      })
      .where(and(eq(creditTxns.custody_ref, custodyRef), eq(creditTxns.status, 'PENDING')))
      .returning();
    return flipped || null;
  },

  async verify(trustDecisionId: string) {
    const decision = await trustGateRepo.findDecisionById(trustDecisionId);
    if (!decision) throw new DomainRuleError('Trust decision not found', 404);

    // Dispute-pause check — single home
    const openDispute = await disputeRepo.findOpenBySource(decision.subject_type, decision.subject_id);
    if (openDispute) {
      throw new DomainRuleError(`Cannot verify credits while an open dispute is active on this ${decision.subject_type.toLowerCase()}`, 409);
    }

    // Flip ledger: find pending credit and verify
    const kind = decision.subject_type as CustodyKind;
    // Only DEPOSIT/PICKUP/REDEMPTION have credits; for REDEMPTION the custodyRef is REDEMPTION-*
    let credit: any = null;
    if (kind === 'DEPOSIT' || kind === 'PICKUP' || kind === 'REDEMPTION') {
      // try canonical first; for legacy deposit also accept raw
      const mappedKind: CustodyKind = kind === 'DEPOSIT' ? 'DEPOSIT' : kind === 'PICKUP' ? 'PICKUP' : 'REDEMPTION';
      // Use findPendingByCustody for DEPOSIT/PICKUP; for REDEMPTION use direct walletRepo
      if (mappedKind === 'DEPOSIT' || mappedKind === 'PICKUP') {
        credit = await this.findPendingByCustody(mappedKind, decision.subject_id);
      } else {
        const ref = encodeCustodyRef('REDEMPTION', decision.subject_id);
        credit = await walletRepo.findByCustodyRef(ref);
        if (!credit || credit.status !== 'PENDING') credit = null;
      }
      if (credit) {
        // Use id-based verify to avoid ref ambiguity and ensure status flip is via repo seam
        credit = await walletRepo.verifyCreditTransaction({ id: credit.id, trustDecisionId });
      } else {
        // No pending credit found — try id-based fallback via custodyRef generic (handles cases where credit was minted with creditTxnId)
        // Try verify by custodyRef canonical
        const ref = kind === 'DEPOSIT' ? encodeCustodyRef('DEPOSIT', decision.subject_id) : kind === 'PICKUP' ? encodeCustodyRef('PICKUP', decision.subject_id) : encodeCustodyRef('REDEMPTION', decision.subject_id);
        credit = await walletRepo.verifyCreditTransaction({ custodyRef: ref, trustDecisionId });
        if (!credit && kind === 'DEPOSIT') {
          // legacy fallback
          credit = await walletRepo.verifyCreditTransaction({ custodyRef: decision.subject_id, trustDecisionId });
        }
      }
    }

    // Streak/badge tail — single home, only if we actually verified a credit
    if (credit) {
      const userId: string | null =
        (decision.evaluated_signals as any)?.user_id ||
        (await resolveUserIdForDecision(decision));
      if (userId) {
        try {
          await WalletDomain.onCreditsVerified(userId);
        } catch (e) {
          console.error('Failed streak/badge tail:', e);
        }
      }
    }

    // Deposit status + verified impact — single home
    try {
      if (decision.subject_type === 'DEPOSIT') {
        const deposit = await depositRepo.findDepositById(decision.subject_id);
        if (deposit) {
          if (deposit.status === 'RECORDED' || deposit.status === 'ESCALATED') {
            await depositRepo.updateDepositVerification(
              deposit.id,
              deposit.verified_quantity || deposit.declared_quantity,
              deposit.verified_bdt || deposit.estimated_bdt,
              deposit.divergence_ratio || 0,
              'VERIFIED'
            );
          }
          const userId = deposit.user_id;
          const qty = Number(deposit.verified_quantity || deposit.declared_quantity);
          await ImpactDomain.recordVerifiedImpact({
            custodyType: 'DEPOSIT',
            custodyId: deposit.id,
            trustDecisionId,
            userId,
            category: deposit.category,
            declaredQuantity: Number(deposit.declared_quantity),
            verifiedQuantity: qty,
            unit: deposit.unit,
          });
        }
      } else if (decision.subject_type === 'PICKUP') {
        const pickup = await pickupRepo.findByIdWithRefs(decision.subject_id);
        if (pickup) {
          const qty =
            pickup.listing.unit === 'piece'
              ? pickup.listing.piece_count || 1
              : Number(pickup.listing.declared_weight || 1);
          await ImpactDomain.recordVerifiedImpact({
            custodyType: 'PICKUP',
            custodyId: decision.subject_id,
            trustDecisionId,
            userId: pickup.order.customer_id!,
            category: pickup.listing.category,
            declaredQuantity: qty,
            verifiedQuantity: qty,
            unit: pickup.listing.unit,
          });
        }
      }
    } catch (e) {
      console.error('Failed impact tail:', e);
    }

    return credit;
  },

  async reject(trustDecisionId: string, reason: string) {
    if (!reason || reason.trim().length === 0) throw new DomainRuleError('Rejection requires a mandatory explanation reason', 400);
    const decision = await trustGateRepo.findDecisionById(trustDecisionId);
    if (!decision) throw new DomainRuleError('Trust decision not found', 404);

    const kind = decision.subject_type as CustodyKind;
    let credit: any = null;
    // Use new repo verb rejectCreditTransaction
    if (kind === 'DEPOSIT' || kind === 'PICKUP') {
      const mappedKind: CustodyKind = kind === 'DEPOSIT' ? 'DEPOSIT' : 'PICKUP';
      const pending = await this.findPendingByCustody(mappedKind, decision.subject_id);
      if (pending) {
        credit = await walletRepo.rejectCreditTransaction({ id: pending.id, trustDecisionId, reason });
      } else {
        const ref = encodeCustodyRef(mappedKind, decision.subject_id);
        credit = await walletRepo.rejectCreditTransaction({ custodyRef: ref, trustDecisionId, reason });
        if (!credit && kind === 'DEPOSIT') {
          credit = await walletRepo.rejectCreditTransaction({ custodyRef: decision.subject_id, trustDecisionId, reason });
        }
      }
    } else if (kind === 'REDEMPTION') {
      // Redemptions are not rejected via this path; settlement uses compensate
      throw new DomainRuleError('Redemption rejection not supported via trust decision', 400);
    }

    // Update deposit status to REJECTED if applicable
    if (decision.subject_type === 'DEPOSIT') {
      const deposit = await depositRepo.findDepositById(decision.subject_id);
      if (deposit) {
        await depositRepo.updateDepositVerification(
          deposit.id,
          deposit.verified_quantity || deposit.declared_quantity,
          deposit.verified_bdt || deposit.estimated_bdt,
          deposit.divergence_ratio || 0,
          'REJECTED'
        );
      }
    }

    return credit;
  },

  async compensate(input: { userId: string; amount: number | string; sourceId?: string | null; custodyRef?: string | null; reason: string }) {
    return walletRepo.createCompensatingTransaction(input);
  },
};

async function resolveUserIdForDecision(decision: any): Promise<string | null> {
  if (decision.subject_type === 'DEPOSIT') {
    const d = await depositRepo.findDepositById(decision.subject_id);
    return d?.user_id || null;
  }
  if (decision.subject_type === 'PICKUP') {
    const p = await pickupRepo.findByIdWithRefs(decision.subject_id);
    return p?.order.customer_id || null;
  }
  if (decision.subject_type === 'REDEMPTION') {
    // redemption user is in evaluated_signals or we can fetch via settlement repo? Avoid extra import; fall back to evaluated_signals
    return (decision.evaluated_signals as any)?.user_id || null;
  }
  return null;
}
