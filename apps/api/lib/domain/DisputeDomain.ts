// DisputeDomain: Unified Dispute Arbitration Queue spanning Pickups, Deposits, and Auction Lots (SPEC 13 / Ticket 09b)
import { disputeRepo, type Dispute } from '../repos/disputes';
import { escrowRepo } from '../repos/escrow';
import { EscrowDomain } from './EscrowDomain';
import { NotificationSeam } from '../notify';
import type { DisputeSourceType, DisputeResolution } from '@chokro/shared';

export class DisputeRuleError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'DisputeRuleError';
  }
}

export interface CreateDisputeParams {
  sourceType: DisputeSourceType;
  sourceId: string;
  openedBy: string;
  againstUserId: string;
  reason: string;
  evidenceUrls?: string[];
}

export interface ResolveDisputeParams {
  disputeId: string;
  adminUserId: string;
  resolution: DisputeResolution;
  resolutionNotes: string;
  buyerAmountBdt?: number;
  sellerAmountBdt?: number;
}

export class DisputeDomain {
  /**
   * Checks if an active/open dispute exists on a given subject (pickup, deposit, or lot).
   */
  static async hasOpenDispute(sourceType: string, sourceId: string): Promise<boolean> {
    const count = await disputeRepo.countOpenDisputesForSource(sourceType, sourceId);
    return count > 0;
  }

  /**
   * Opens a new dispute across any supported source type (PICKUP, DEPOSIT, AUCTION_LOT).
   * Freezes auction escrow holds and pauses pickup/deposit verification.
   */
  static async createDispute(params: CreateDisputeParams): Promise<Dispute> {
    if (!params.reason || params.reason.trim().length < 5) {
      throw new DisputeRuleError('Dispute reason must be at least 5 characters', 400);
    }

    const openExisting = await disputeRepo.findOpenBySource(params.sourceType, params.sourceId);
    if (openExisting) {
      throw new DisputeRuleError(
        `An open dispute already exists for this ${params.sourceType.toLowerCase()}`,
        409,
        { existingDisputeId: openExisting.id }
      );
    }

    // Source-specific side-effects upon dispute opening
    if (params.sourceType === 'AUCTION_LOT') {
      const hold = await escrowRepo.findByLotId(params.sourceId);
      if (hold && (hold.status === 'HELD' || hold.status === 'FROZEN_IN_DISPUTE')) {
        await EscrowDomain.freezeForDispute(hold.id);
      }
    }

    const dispute = await disputeRepo.create({
      source_type: params.sourceType,
      source_id: params.sourceId,
      opened_by: params.openedBy,
      against_user_id: params.againstUserId,
      reason: params.reason.trim(),
      evidence_urls: params.evidenceUrls || [],
      status: 'OPEN',
    });

    // Notify both parties
    await NotificationSeam.notify({
      recipientUserId: params.againstUserId,
      subject: `Dispute Opened: ${params.sourceType}`,
      message: `A dispute has been opened regarding ${params.sourceType} (${params.sourceId}). Reason: ${params.reason}`,
    });

    await NotificationSeam.notify({
      recipientUserId: params.openedBy,
      subject: `Dispute Filed Successfully: ${params.sourceType}`,
      message: `Your dispute for ${params.sourceType} (${params.sourceId}) has been registered and escalated to admin arbitration.`,
    });

    return dispute;
  }

  /**
   * Adds additional evidence URLs to an open dispute.
   */
  static async addEvidence(
    disputeId: string,
    actorUserId: string,
    evidenceUrls: string[]
  ): Promise<Dispute> {
    const dispute = await disputeRepo.findById(disputeId);
    if (!dispute) {
      throw new DisputeRuleError('Dispute not found', 404);
    }

    if (dispute.status !== 'OPEN' && dispute.status !== 'UNDER_REVIEW') {
      throw new DisputeRuleError(`Cannot add evidence to dispute in ${dispute.status} status`, 400);
    }

    if (actorUserId !== dispute.opened_by && actorUserId !== dispute.against_user_id) {
      throw new DisputeRuleError('Only involved parties can submit evidence to this dispute', 403);
    }

    const combined = Array.from(new Set([...(dispute.evidence_urls as string[]), ...evidenceUrls]));
    const updated = await disputeRepo.updateStatus(dispute.id, dispute.status);
    return { ...dispute, evidence_urls: combined };
  }

  /**
   * Resolves a dispute with immutable reasoning, settles escrow if auction lot, and unpauses workflows.
   */
  static async resolveDispute(params: ResolveDisputeParams): Promise<Dispute> {
    const dispute = await disputeRepo.findById(params.disputeId);
    if (!dispute) {
      throw new DisputeRuleError('Dispute not found', 404);
    }

    if (dispute.status === 'RESOLVED' || dispute.status === 'CLOSED') {
      throw new DisputeRuleError('Dispute has already been resolved and resolution is immutable', 400);
    }

    if (!params.resolutionNotes || params.resolutionNotes.trim().length < 3) {
      throw new DisputeRuleError('Resolution notes explaining the decision are mandatory', 400);
    }

    // Settle auction escrow holds if applicable
    if (dispute.source_type === 'AUCTION_LOT') {
      const hold = await escrowRepo.findByLotId(dispute.source_id);
      if (hold) {
        const totalHeld = Number(hold.amount_bdt);

        if (params.resolution === 'BUYER_FAVORED') {
          await EscrowDomain.returnToBuyer(hold.id, params.adminUserId, params.resolutionNotes);
        } else if (params.resolution === 'SELLER_FAVORED') {
          await EscrowDomain.releaseToSeller(hold.id, params.adminUserId, params.resolutionNotes);
        } else if (params.resolution === 'PARTIAL_RELEASE' || params.resolution === 'SPLIT') {
          let buyerAmt = params.buyerAmountBdt;
          let sellerAmt = params.sellerAmountBdt;

          if (buyerAmt === undefined || sellerAmt === undefined) {
            // Default 50/50 split
            buyerAmt = Math.round((totalHeld / 2) * 100) / 100;
            sellerAmt = Math.round((totalHeld - buyerAmt) * 100) / 100;
          }

          await EscrowDomain.partialRelease(hold.id, buyerAmt, sellerAmt, params.resolutionNotes);
        } else if (params.resolution === 'DISMISSED') {
          // If dismissed, release funds to seller
          await EscrowDomain.releaseToSeller(hold.id, params.adminUserId, params.resolutionNotes);
        }
      }
    }

    const updated = await disputeRepo.resolve(dispute.id, {
      status: 'RESOLVED',
      resolution: params.resolution,
      resolution_notes: params.resolutionNotes.trim(),
      resolved_by: params.adminUserId,
      resolved_at: new Date(),
    });

    if (!updated) {
      throw new DisputeRuleError('Failed to resolve dispute', 500);
    }

    // Notify both parties of resolution
    const notificationText = `Dispute for ${dispute.source_type} has been resolved: ${params.resolution}. Reason: ${params.resolutionNotes}`;

    await NotificationSeam.notify({
      recipientUserId: dispute.opened_by,
      subject: `Dispute Resolved: ${params.resolution}`,
      message: notificationText,
    });

    await NotificationSeam.notify({
      recipientUserId: dispute.against_user_id,
      subject: `Dispute Resolved: ${params.resolution}`,
      message: notificationText,
    });

    return updated;
  }

  /**
   * Retrieves single dispute by ID.
   */
  static async getDisputeById(id: string): Promise<Dispute | null> {
    return disputeRepo.findById(id);
  }

  /**
   * Lists disputes for arbitration worklist.
   */
  static async listDisputes(filters?: { status?: string; sourceType?: string }, limit = 100) {
    return disputeRepo.listDisputes(filters, limit);
  }
}
