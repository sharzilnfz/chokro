// EscrowDomain: Deep Module for B2B Auction Escrow Holds & Inspection Window Settlement (SPEC 13 / Ticket 09b)
import { escrowRepo, type EscrowHold } from '../repos/escrow';
import { auctionRepo, type AuctionLot, type AuctionBid } from '../repos/auctions';
import { disputeRepo } from '../repos/disputes';
import { NotificationSeam } from '../notify';
import { DomainRuleError } from '../database';
import type { Role } from '@chokro/shared';

export const DEFAULT_INSPECTION_HOURS = 48;

/**
 * The authenticated principal attempting an escrow mutation. The module enforces
 * buyer/seller/admin authorization itself — route-level checks are defense in
 * depth, never the only gate.
 */
export interface EscrowActor {
  userId: string;
  role: Role;
}

const ESCROW_TRANSITIONS: Record<string, string[]> = {
  HELD: ['RELEASED_TO_SELLER', 'RETURNED_TO_BUYER', 'PARTIALLY_RELEASED', 'FROZEN_IN_DISPUTE'],
  FROZEN_IN_DISPUTE: ['RELEASED_TO_SELLER', 'RETURNED_TO_BUYER', 'PARTIALLY_RELEASED', 'HELD', 'FROZEN_IN_DISPUTE'],
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
   * Explicit sweep entry point: releases expired HELD holds whose inspection
   * window passed without an active dispute (funds go to the seller), and
   * freezes expired HELD holds that do have an open dispute. Callers invoke it
   * where expiry matters for correctness (lot-close reads) or from a scheduled
   * hook — never implicitly on a pure read.
   */
  static async sweepExpiredHolds(asOf = new Date()): Promise<{
    released: EscrowHold[];
    frozen: EscrowHold[];
  }> {
    const expiredHolds = await escrowRepo.findExpiredHeld(asOf);
    const released: EscrowHold[] = [];
    const frozen: EscrowHold[] = [];

    for (const hold of expiredHolds) {
      const openDispute = await disputeRepo.findOpenBySource('AUCTION_LOT', hold.lot_id);
      if (openDispute) {
        const frozenHold = await this.freezeForDispute(hold.id);
        if (frozenHold.status === 'FROZEN_IN_DISPUTE') frozen.push(frozenHold);
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

    return { released, frozen };
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

    // Lot-close entry point: settle any holds whose inspection window has
    // already elapsed before committing a new one (explicit sweep — see
    // sweepExpiredHolds).
    await this.sweepExpiredHolds();

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
   * Retrieves escrow hold by ID. Pure read — no state mutation; expired holds
   * are swept explicitly via sweepExpiredHolds().
   */
  static async getHoldById(id: string): Promise<EscrowHold | null> {
    return escrowRepo.findById(id);
  }

  /**
   * Retrieves escrow hold by lot ID. Pure read — no state mutation; expired
   * holds are swept explicitly via sweepExpiredHolds().
   */
  static async getHoldByLotId(lotId: string): Promise<EscrowHold | null> {
    return escrowRepo.findByLotId(lotId);
  }

  /**
   * Authorization lives inside the module (defense in depth): only the buyer,
   * the seller, or an Admin may mutate a hold — and while a hold is frozen in
   * dispute, only an Admin may act on it. Unrelated actors get 403.
   */
  private static assertActorCanMutate(hold: EscrowHold, actor: EscrowActor): void {
    if (actor.role === 'ADMIN') return;
    if (hold.status === 'FROZEN_IN_DISPUTE') {
      throw new DomainRuleError('Only an Admin can act on an escrow hold frozen in dispute', 403);
    }
    if (actor.userId !== hold.buyer_id && actor.userId !== hold.seller_id) {
      throw new DomainRuleError(
        'Only the buyer, the seller, or an Admin may act on this escrow hold',
        403
      );
    }
  }

  /**
   * Release escrow funds to seller (e.g. buyer accepts lot or admin resolves).
   */
  static async releaseToSeller(
    escrowHoldId: string,
    actor: EscrowActor,
    notes?: string
  ): Promise<EscrowHold> {
    const hold = await escrowRepo.findById(escrowHoldId);
    if (!hold) {
      throw new DomainRuleError('Escrow hold not found', 404);
    }

    this.assertActorCanMutate(hold, actor);

    this.assertTransition(hold.status, 'RELEASED_TO_SELLER');

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
    actor: EscrowActor,
    notes?: string
  ): Promise<EscrowHold> {
    const hold = await escrowRepo.findById(escrowHoldId);
    if (!hold) {
      throw new DomainRuleError('Escrow hold not found', 404);
    }

    this.assertActorCanMutate(hold, actor);

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

    this.assertTransition(hold.status, 'FROZEN_IN_DISPUTE');

    const updated = await escrowRepo.updateStatus(hold.id, 'FROZEN_IN_DISPUTE');
    return updated ?? hold;
  }
}
