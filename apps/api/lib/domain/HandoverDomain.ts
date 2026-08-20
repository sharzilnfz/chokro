// HandoverDomain: 2-Sided OTP Custody Handshake, Admin Escalation Worklist Adjudication, and Appeals (SPEC 12 / Ticket 08b)
import crypto from 'crypto';
import { db, creditTxns, depositRecords, pickupOrders, trustDecisions, eq, and } from '@chokro/db';
import { handoverRepo } from '../repos/handovers';
import { pickupRepo } from '../repos/pickups';
import { trustGateRepo } from '../repos/trustGate';
import { walletRepo } from '../repos/wallet';
import { depositRepo } from '../repos/deposits';
import { disputeRepo } from '../repos/disputes';
import { TrustGateDomain } from './TrustGateDomain';
import { WalletDomain } from './WalletDomain';
import { ImpactDomain } from './ImpactDomain';
import { NotificationSeam } from '../notify';
import type { EscalationWorklistItem, AdjudicateDecisionInput, ContestDecisionInput } from '@chokro/shared';

export class HandoverDomain {
  /**
   * Generates a 6-digit numeric OTP challenge code
   */
  static generateOtp(length = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
  }

  /**
   * Hashes the OTP using SHA-256 for secure constant-time verification
   */
  static hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Compares two hex hashes in constant time to prevent timing attacks
   */
  static constantTimeCompare(hashA: string, hashB: string): boolean {
    if (!hashA || !hashB || hashA.length !== hashB.length) {
      return false;
    }
    const bufA = Buffer.from(hashA, 'hex');
    const bufB = Buffer.from(hashB, 'hex');
    if (bufA.length !== bufB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Initiates or generates a 6-digit custody handover challenge code for a pickup task (15m expiration)
   */
  static async generateHandoverChallenge(taskId: string, actorUserId: string) {
    const pickup = await pickupRepo.findByIdWithRefs(taskId);
    if (!pickup) {
      throw new Error('Pickup order not found');
    }

    if (!pickup.order.collector_partner_id) {
      throw new Error('Pickup order must be assigned to a collector before generating handover challenge');
    }

    // Authorization: Giver (customer), assigned collector, or admin
    const isCustomer = pickup.order.customer_id === actorUserId;
    const isCollector = pickup.collector?.user_id === actorUserId;

    if (!isCustomer && !isCollector) {
      throw new Error('Not authorized to generate handover challenge for this pickup');
    }

    // Check if an existing valid pending handover exists
    const existing = await handoverRepo.findLatestHandoverByTaskId(taskId);
    const now = new Date();
    if (existing && existing.status === 'PENDING' && new Date(existing.expires_at) > now) {
      // Handover already active
      return {
        handover: existing,
        isExisting: true,
      };
    }

    const otpCode = this.generateOtp(6);
    const otpHash = this.hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

    const handover = await handoverRepo.createHandover({
      task_id: taskId,
      otp_code_hash: otpHash,
      giver_user_id: pickup.order.customer_id!,
      collector_partner_id: pickup.order.collector_partner_id,
      expires_at: expiresAt,
      status: 'PENDING',
    });

    // Notify giver
    await NotificationSeam.notify({
      recipientUserId: pickup.order.customer_id!,
      subject: 'Your Chokro Pickup Handover Code',
      message: `Your 6-digit pickup handover challenge code is ${otpCode}. Share this code with your collector upon arrival. Expires in 15 minutes.`,
    });

    return {
      handover,
      otpCode,
      isExisting: false,
    };
  }

  /**
   * Collector submits 6-digit OTP to complete physical custody handover.
   * Constant-time comparison, moves handover to CONFIRMED, pickup task to COLLECTED,
   * mints pending green credits, and submits bundle to Trust Gate.
   */
  static async verifyOtp(params: {
    taskId: string;
    otpCode: string;
    actorUserId: string;
    verifiedQuantity?: number | null;
    verifiedCondition?: string | null;
    notes?: string | null;
  }) {
    const pickup = await pickupRepo.findByIdWithRefs(params.taskId);
    if (!pickup) {
      throw new Error('Pickup order not found');
    }

    // Verify collector permission
    const isAssigned = pickup.collector?.user_id === params.actorUserId;
    if (!isAssigned) {
      throw new Error('Only the assigned collector can verify custody handover OTP');
    }

    // Order must be in ASSIGNED or EN_ROUTE status
    if (pickup.order.status !== 'ASSIGNED' && pickup.order.status !== 'EN_ROUTE') {
      throw new Error(`Cannot verify handover for pickup in ${pickup.order.status} status`);
    }

    const handover = await handoverRepo.findLatestHandoverByTaskId(params.taskId);
    if (!handover || handover.status !== 'PENDING') {
      throw new Error('No pending handover challenge found for this pickup task');
    }

    // Check expiration
    const now = new Date();
    if (now > new Date(handover.expires_at)) {
      await handoverRepo.updateHandoverStatus(handover.id, 'EXPIRED');
      throw new Error('Handover challenge code has expired (15m validity). Please request a new code.');
    }

    // Verify OTP using constant-time hash comparison
    const incomingHash = this.hashOtp(params.otpCode);
    const isMatch = this.constantTimeCompare(handover.otp_code_hash, incomingHash);

    if (!isMatch) {
      // Mismatch raises fraud flag on collector
      await trustGateRepo.createFraudFlag({
        entity_type: 'PARTNER',
        entity_id: handover.collector_partner_id,
        flag_type: 'OTP_MISMATCH',
        reason: `Mismatched custody handover OTP challenge code on pickup task ${params.taskId}`,
        severity: 'HIGH',
      });

      await handoverRepo.updateHandoverStatus(handover.id, 'FAILED');
      throw new Error('Invalid custody handover OTP challenge code. Fraud flag recorded.');
    }

    // Valid OTP: Move handover to CONFIRMED
    const confirmedHandover = await handoverRepo.updateHandoverStatus(
      handover.id,
      'CONFIRMED',
      new Date()
    );

    // Transition pickup task to COLLECTED
    const updatedOrder = await pickupRepo.updateStatus(params.taskId, 'COLLECTED');

    // Calculate credit amount based on verified quantity or declared listing price
    const listing = pickup.listing;
    let creditAmount = Number(listing.price_bdt || 0);

    if (
      params.verifiedQuantity != null &&
      listing.declared_weight != null &&
      Number(listing.declared_weight) > 0
    ) {
      const ratio = Number(params.verifiedQuantity) / Number(listing.declared_weight);
      creditAmount = Math.round(Number(listing.price_bdt) * ratio * 100) / 100;
    }

    const custodyRef = `CUSTODY-PICKUP-${params.taskId}`;

    // Mint pending green credit
    const creditTxn = await walletRepo.createEarnTransaction({
      userId: handover.giver_user_id,
      amount: creditAmount,
      custodyRef,
      status: 'PENDING',
      reason: `Pickup custody handover confirmed for ${listing.category}`,
    });

    const declaredQty =
      listing.unit === 'piece'
        ? (listing.piece_count || 1)
        : (Number(listing.declared_weight) || 1);
    const verifiedQty = params.verifiedQuantity ?? declaredQty;

    // Submit evidence bundle to Trust Gate
    const trustDecision = await TrustGateDomain.evaluateAndApply(
      {
        subjectType: 'PICKUP',
        subjectId: params.taskId,
        userId: handover.giver_user_id,
        partnerId: handover.collector_partner_id,
        category: (listing.category as any) || 'PLASTICS',
        declaredQuantity: declaredQty,
        verifiedQuantity: verifiedQty,
        unit: (listing.unit as any) || 'kg',
        isSessionValid: true, // 2-sided OTP custody verified
        inAppCaptured: true,
        creditTxnId: creditTxn.id,
        custodyRef,
        estimatedBdt: creditAmount,
      },
      { userId: params.actorUserId, role: 'PARTNER' }
    );

    // Notify giver
    await NotificationSeam.notify({
      recipientUserId: handover.giver_user_id,
      subject: 'Pickup Custody Confirmed — Green Credits Minted',
      message: `Your pickup for ${listing.category} has been collected. ${creditAmount.toFixed(2)} Green Credits have been minted (${trustDecision.decision === 'AUTO_CLEAR' ? 'Verified' : 'Under Review'}).`,
    });

    return {
      success: true,
      handover: confirmedHandover,
      order: updatedOrder,
      creditTxn,
      trustDecision,
    };
  }

  /**
   * Retrieves the Admin Escalation Worklist (A07)
   */
  static async getEscalationWorklist(limit = 100): Promise<EscalationWorklistItem[]> {
    return handoverRepo.getEscalations(limit);
  }

  /**
   * Admin adjudication of an escalated decision: VERIFY or REJECT
   */
  static async adjudicateDecision(
    decisionId: string,
    input: AdjudicateDecisionInput,
    adminUserId: string
  ) {
    if (input.action === 'REJECT' && (!input.reason || input.reason.trim().length === 0)) {
      throw new Error('Rejection requires a mandatory explanation reason');
    }

    const decision = await trustGateRepo.findDecisionById(decisionId);
    if (!decision) {
      throw new Error('Trust decision not found');
    }

    // Check for decision contests
    const contests = await handoverRepo.findContestsByDecisionId(decisionId);
    const pendingContest = contests.find((c) => c.status === 'PENDING');

    let creditTxn = null;

    if (input.action === 'VERIFY') {
      const openDispute = await disputeRepo.findOpenBySource(decision.subject_type, decision.subject_id);
      if (openDispute) {
        throw new Error(`Cannot verify credits while an open dispute is active on this ${decision.subject_type.toLowerCase()}`);
      }

      // 1. Flip credit transaction to VERIFIED
      creditTxn = await walletRepo.verifyCreditTransaction({
        trustDecisionId: decisionId,
      });

      // If credit was not linked by trustDecisionId, try finding by custodyRef or subjectId
      if (!creditTxn) {
        const custodyRef =
          decision.subject_type === 'PICKUP'
            ? `CUSTODY-PICKUP-${decision.subject_id}`
            : `CUSTODY-DEP-${decision.subject_id}`;
        creditTxn = await walletRepo.verifyCreditTransaction({
          custodyRef,
          trustDecisionId: decisionId,
        });
      }

      // If deposit subject, update deposit status to VERIFIED
      if (decision.subject_type === 'DEPOSIT') {
        const deposit = await depositRepo.findDepositById(decision.subject_id);
        if (deposit) {
          await depositRepo.updateDepositVerification(
            deposit.id,
            deposit.verified_quantity || deposit.declared_quantity,
            deposit.verified_bdt || deposit.estimated_bdt,
            deposit.divergence_ratio || 0,
            'VERIFIED'
          );
          await WalletDomain.onCreditsVerified(deposit.user_id);
          try {
            await ImpactDomain.recordVerifiedImpact({
              custodyType: 'DEPOSIT',
              custodyId: deposit.id,
              trustDecisionId: decisionId,
              userId: deposit.user_id,
              category: deposit.category,
              declaredQuantity: Number(deposit.declared_quantity),
              verifiedQuantity: Number(deposit.verified_quantity || deposit.declared_quantity),
              unit: deposit.unit,
            });
          } catch (err) {
            console.error('Failed to record verified impact on adjudication:', err);
          }
        }
      } else if (decision.subject_type === 'PICKUP') {
        const pickup = await pickupRepo.findByIdWithRefs(decision.subject_id);
        if (pickup) {
          try {
            const qty =
              pickup.listing.unit === 'piece'
                ? pickup.listing.piece_count || 1
                : Number(pickup.listing.declared_weight || 1);
            await ImpactDomain.recordVerifiedImpact({
              custodyType: 'PICKUP',
              custodyId: decision.subject_id,
              trustDecisionId: decisionId,
              userId: pickup.order.customer_id!,
              category: pickup.listing.category,
              declaredQuantity: qty,
              verifiedQuantity: qty,
              unit: pickup.listing.unit,
            });
          } catch (err) {
            console.error('Failed to record verified impact on adjudication:', err);
          }
        }
      }

      // If contest existed, mark OVERTURNED
      if (pendingContest) {
        await handoverRepo.updateDecisionContestStatus(
          pendingContest.id,
          'OVERTURNED',
          adminUserId
        );
      }

      // Update decision notes
      await db
        .update(trustDecisions)
        .set({
          notes: `Adjudicated VERIFIED by admin ${adminUserId}${input.reason ? `: ${input.reason}` : ''}`,
          decided_by: adminUserId,
          decided_at: new Date(),
        })
        .where(eq(trustDecisions.id, decisionId));

      return {
        success: true,
        action: 'VERIFIED',
        decisionId,
        creditTxn,
      };
    } else {
      // REJECT action
      // 1. Flip credit transaction to REJECTED
      const conditions = [eq(creditTxns.status, 'PENDING')];
      const custodyRef =
        decision.subject_type === 'PICKUP'
          ? `CUSTODY-PICKUP-${decision.subject_id}`
          : `CUSTODY-DEP-${decision.subject_id}`;

      await db
        .update(creditTxns)
        .set({
          status: 'REJECTED',
          reason: input.reason,
          trust_decision_id: decisionId,
        })
        .where(
          and(
            eq(creditTxns.status, 'PENDING'),
            eq(creditTxns.custody_ref, custodyRef)
          )
        );

      // If deposit, update deposit status to REJECTED
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

      // If contest existed, mark UPHELD
      if (pendingContest) {
        await handoverRepo.updateDecisionContestStatus(
          pendingContest.id,
          'UPHELD',
          adminUserId
        );
      }

      // Update decision notes
      await db
        .update(trustDecisions)
        .set({
          notes: `Adjudicated REJECTED by admin ${adminUserId}: ${input.reason}`,
          decided_by: adminUserId,
          decided_at: new Date(),
        })
        .where(eq(trustDecisions.id, decisionId));

      return {
        success: true,
        action: 'REJECTED',
        decisionId,
        reason: input.reason,
      };
    }
  }

  /**
   * One-time appeal / contest on an escalated or rejected decision
   */
  static async contestDecision(input: ContestDecisionInput, userId: string) {
    const decision = await trustGateRepo.findDecisionById(input.decisionId);
    if (!decision) {
      throw new Error('Trust decision not found');
    }

    // Check if decision has already been contested
    const existingContests = await handoverRepo.findContestsByDecisionId(input.decisionId);
    if (existingContests.length > 0) {
      throw new Error('This decision has already been contested once. Multiple appeals are not permitted.');
    }

    const contest = await handoverRepo.createDecisionContest({
      decision_id: input.decisionId,
      user_id: userId,
      reason: input.reason,
      status: 'PENDING',
    });

    // Notify admins of new appeal
    await NotificationSeam.notify({
      subject: 'New Trust Decision Contest Appeal',
      message: `User ${userId} contested decision ${input.decisionId}. Reason: ${input.reason}`,
    });

    return contest;
  }
}
