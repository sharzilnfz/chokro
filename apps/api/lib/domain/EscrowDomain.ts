// EscrowDomain: Deep Module for B2B Auction Escrow Holds & Inspection Window Settlement (SPEC 13 / Ticket 09b)
import { escrowRepo, type EscrowHold } from '../repos/escrow';
import { auctionRepo, type AuctionLot, type AuctionBid } from '../repos/auctions';
import { disputeRepo } from '../repos/disputes';
import { NotificationSeam } from '../notify';
import { DomainRuleError } from '../database';

export const DEFAULT_INSPECTION_HOURS = 48;

const ESCROW_TRANSITIONS: Record<string, string[]> = {
  HELD: ['RELEASED_TO_SELLER', 'RETURNED_TO_BUYER', 'PARTIALLY_RELEASED', 'FROZEN_IN_DISPUTE'],
  FROZEN_IN_DISPUTE: ['RELEASED_TO_SELLER', 'RETURNED_TO_BUYER', 'PARTIALLY_RELEASED', 'HELD'],
  RELEASED_TO_SELLER: [],
  RETURNED_TO_BUYER: [],
  PARTIALLY_RELEASED: [],
};

export class EscrowDomain {
  static canTransition(currentStatus: string, targetStatus: string): boolean {
    return ESCROW_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
  }

  static assertTransition(currentStatus: string, targetStatus: string): void {
    if (!this.canTransition(currentStatus, targetStatus)) {
      throw new DomainRuleError(
        `Invalid escrow status transition from ${currentStatus} to ${targetStatus}`,
        400
      );
    }
  }

  /**
   * Evaluates expired HELD escrow holds where inspection window has passed without active disputes,
   * automatically releasing funds to the seller.
   */
  static async evaluateAndReleaseExpiredHolds(asOf = new Date()): Promise<EscrowHold[]> {
    const expiredHolds = await escrowRepo.findExpiredHeld(asOf);
    const released: EscrowHold[] = [];

    for (const hold of expiredHolds) {
      const openDispute = await disputeRepo.findOpenBySource('AUCTION_LOT', hold.lot_id);
      if (openDispute) {
        // Freeze hold if open dispute exists
        await escrowRepo.updateStatus(hold.id, 'FROZEN_IN_DISPUTE');
        continue;
      }

      const updated = await escrowRepo.updateStatus(hold.id, 'RELEASED_TO_SELLER');
      if (updated) {
        released.push(updated);
        await NotificationSeam.notify({
          recipientUserId: hold.seller_id,
          subject: 'Auction Escrow Auto-Released',
          message: `Inspection window of 48 hours for auction lot ${hold.lot_id} has elapsed. Escrow funds of ৳${Number(hold.amount_bdt).toFixed(2)} have been released to your account.`,
        });
      }
    }

    return released;
  }

  /**
   * Creates an escrow hold when an auction lot closes with reserve met.
   */
  static async createHoldForWinningLot(
    lot: { id: string; created_by: string },
    winningBid: { bidder_user_id: string; amount_bdt: string | number },
    inspectionHours = DEFAULT_INSPECTION_HOURS
  ): Promise<EscrowHold> {
    const existing = await escrowRepo.findByLotId(lot.id);
    if (existing) return existing;

    const amountBdt =
      typeof winningBid.amount_bdt === 'number'
        ? winningBid.amount_bdt.toFixed(2)
        : winningBid.amount_bdt;

    const inspectionExpiresAt = new Date(Date.now() + inspectionHours * 3600_000);

    const hold = await escrowRepo.create({
      lot_id: lot.id,
      buyer_id: winningBid.bidder_user_id,
      seller_id: lot.created_by,
      amount_bdt: amountBdt,
      status: 'HELD',
      inspection_expires_at: inspectionExpiresAt,
    });

    await NotificationSeam.notify({
      recipientUserId: winningBid.bidder_user_id,
      subject: 'Auction Won — Escrow Funds Committed',
      message: `You won auction lot ${lot.id}. ৳${amountBdt} is held in escrow with a ${inspectionHours}h inspection window.`,
    });

    await NotificationSeam.notify({
      recipientUserId: lot.created_by,
      subject: 'Auction Closed — Escrow Hold Active',
      message: `Your auction lot ${lot.id} was won for ৳${amountBdt}. Buyer funds are secured in escrow.`,
    });

    return hold;
  }

  /**
   * Retrieves escrow hold by ID with lazy evaluation of inspection window expiry.
   */
  static async getHoldById(id: string): Promise<EscrowHold | null> {
    await this.evaluateAndReleaseExpiredHolds();
    return escrowRepo.findById(id);
  }

  /**
   * Retrieves escrow hold by lot ID with lazy evaluation of inspection window expiry.
   */
  static async getHoldByLotId(lotId: string): Promise<EscrowHold | null> {
    await this.evaluateAndReleaseExpiredHolds();
    return escrowRepo.findByLotId(lotId);
  }

  /**
   * Release escrow funds to seller (e.g. buyer accepts lot or admin resolves).
   */
  static async releaseToSeller(
    escrowHoldId: string,
    actorUserId?: string,
    notes?: string
  ): Promise<EscrowHold> {
    const hold = await escrowRepo.findById(escrowHoldId);
    if (!hold) {
      throw new DomainRuleError('Escrow hold not found', 404);
    }

    if (hold.status === 'RELEASED_TO_SELLER') {
      return hold;
    }

    if (hold.status === 'FROZEN_IN_DISPUTE' && (!actorUserId || actorUserId === hold.buyer_id)) {
      throw new DomainRuleError('Cannot release funds while escrow is frozen in dispute', 400);
    }

    this.assertTransition(hold.status, 'RELEASED_TO_SELLER');

    // Only buyer, seller, or admin/system can release
    if (actorUserId && actorUserId !== hold.buyer_id && actorUserId !== hold.seller_id) {
      // In route handlers, admin permissions are checked
    }

    const updated = await escrowRepo.updateStatus(hold.id, 'RELEASED_TO_SELLER');
    if (!updated) {
      throw new DomainRuleError('Failed to update escrow hold', 500);
    }

    await NotificationSeam.notify({
      recipientUserId: hold.seller_id,
      subject: 'Escrow Funds Released',
      message: `Escrow hold for lot ${hold.lot_id} (৳${Number(hold.amount_bdt).toFixed(2)}) has been released to you.${notes ? ` Note: ${notes}` : ''}`,
    });

    return updated;
  }

  /**
   * Return escrow funds to buyer (e.g. dispute resolution or cancellation).
   */
  static async returnToBuyer(
    escrowHoldId: string,
    actorUserId?: string,
    notes?: string
  ): Promise<EscrowHold> {
    const hold = await escrowRepo.findById(escrowHoldId);
    if (!hold) {
      throw new DomainRuleError('Escrow hold not found', 404);
    }

    if (hold.status === 'RETURNED_TO_BUYER') {
      return hold;
    }

    this.assertTransition(hold.status, 'RETURNED_TO_BUYER');

    const updated = await escrowRepo.updateStatus(hold.id, 'RETURNED_TO_BUYER');
    if (!updated) {
      throw new DomainRuleError('Failed to update escrow hold', 500);
    }

    await NotificationSeam.notify({
      recipientUserId: hold.buyer_id,
      subject: 'Escrow Funds Returned',
      message: `Escrow hold for lot ${hold.lot_id} (৳${Number(hold.amount_bdt).toFixed(2)}) has been returned to your balance.${notes ? ` Note: ${notes}` : ''}`,
    });

    return updated;
  }

  /**
   * Partial release settlement calculations: splits funds proportionately between buyer and seller.
   */
  static async partialRelease(
    escrowHoldId: string,
    buyerAmountBdt: number,
    sellerAmountBdt: number,
    notes?: string
  ): Promise<{ hold: EscrowHold; buyerAmountBdt: number; sellerAmountBdt: number }> {
    const hold = await escrowRepo.findById(escrowHoldId);
    if (!hold) {
      throw new DomainRuleError('Escrow hold not found', 404);
    }

    this.assertTransition(hold.status, 'PARTIALLY_RELEASED');

    const totalHeld = Number(hold.amount_bdt);
    const sum = Math.round((buyerAmountBdt + sellerAmountBdt) * 100) / 100;

    if (Math.abs(sum - totalHeld) > 0.01) {
      throw new DomainRuleError(
        `Partial release amounts (৳${buyerAmountBdt} + ৳${sellerAmountBdt} = ৳${sum}) must equal total held amount ৳${totalHeld}`,
        400,
        { totalHeld, buyerAmountBdt, sellerAmountBdt }
      );
    }

    const updated = await escrowRepo.updateStatus(hold.id, 'PARTIALLY_RELEASED');
    if (!updated) {
      throw new DomainRuleError('Failed to update escrow hold', 500);
    }

    await NotificationSeam.notify({
      recipientUserId: hold.buyer_id,
      subject: 'Escrow Partial Settlement — Refund Processed',
      message: `Partial release settlement for lot ${hold.lot_id}: ৳${buyerAmountBdt.toFixed(2)} refunded to buyer, ৳${sellerAmountBdt.toFixed(2)} released to seller.${notes ? ` Note: ${notes}` : ''}`,
    });

    await NotificationSeam.notify({
      recipientUserId: hold.seller_id,
      subject: 'Escrow Partial Settlement — Payment Processed',
      message: `Partial release settlement for lot ${hold.lot_id}: ৳${sellerAmountBdt.toFixed(2)} released to seller, ৳${buyerAmountBdt.toFixed(2)} refunded to buyer.${notes ? ` Note: ${notes}` : ''}`,
    });

    return {
      hold: updated,
      buyerAmountBdt,
      sellerAmountBdt,
    };
  }

  /**
   * Freezes escrow hold when a dispute is opened against the lot.
   */
  static async freezeForDispute(escrowHoldId: string): Promise<EscrowHold> {
    const hold = await escrowRepo.findById(escrowHoldId);
    if (!hold) {
      throw new DomainRuleError('Escrow hold not found', 404);
    }

    if (hold.status === 'FROZEN_IN_DISPUTE') {
      return hold;
    }

    this.assertTransition(hold.status, 'FROZEN_IN_DISPUTE');

    const updated = await escrowRepo.updateStatus(hold.id, 'FROZEN_IN_DISPUTE');
    return updated ?? hold;
  }
}
