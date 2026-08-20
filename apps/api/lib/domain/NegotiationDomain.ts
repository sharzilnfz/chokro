import {
  negotiationRepo,
  type NegotiationOffer,
} from '@/lib/repos/negotiations';
import { listingRepo } from '@/lib/repos/listings';
import { pickupRepo } from '@/lib/repos/pickups';
import { NegotiationRealtimeService } from '@/lib/services/NegotiationRealtimeService';
import type {
  CreateNegotiationThreadInput,
  CreateCounterOfferInput,
} from '@chokro/shared';

export const DEFAULT_OFFER_TTL_HOURS = 24;

export class NegotiationRuleError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'NegotiationRuleError';
  }
}

export const NegotiationDomain = {
  /**
   * Lazily checks if a pending offer has expired past its 24h TTL and updates it.
   */
  async checkAndExpireOffer(offer: NegotiationOffer): Promise<NegotiationOffer> {
    if (offer.status === 'PENDING' && new Date(offer.expires_at).getTime() <= Date.now()) {
      const updated = await negotiationRepo.updateOfferStatus(offer.id, 'EXPIRED');
      return updated ?? offer;
    }
    return offer;
  },

  /**
   * Creates a new negotiation thread with an initial binding offer.
   */
  async createThread(buyerId: string, input: CreateNegotiationThreadInput) {
    const listing = await listingRepo.findById(input.listingId);
    if (!listing) {
      throw new NegotiationRuleError('Listing not found', 404);
    }

    if (listing.status !== 'ACTIVE') {
      throw new NegotiationRuleError('Cannot negotiate on an inactive listing', 400);
    }

    if (listing.owner_id === buyerId) {
      throw new NegotiationRuleError('Listing owner cannot negotiate on their own listing', 400);
    }

    const expiresAt = new Date(Date.now() + DEFAULT_OFFER_TTL_HOURS * 60 * 60 * 1000);
    const pickupDate = input.proposedPickupAt ? new Date(input.proposedPickupAt) : null;

    // Create thread
    const thread = await negotiationRepo.createThread({
      listing_id: input.listingId,
      buyer_id: buyerId,
      seller_id: listing.owner_id,
      status: 'OPEN',
    });

    // Create initial binding offer
    const offer = await negotiationRepo.createOffer({
      thread_id: thread.id,
      offered_by_user_id: buyerId,
      offer_amount_bdt: input.initialOfferAmountBdt,
      offered_quantity: input.offeredQuantity,
      unit: input.unit || listing.unit,
      proposed_pickup_at: pickupDate,
      notes: input.notes ?? null,
      status: 'PENDING',
      expires_at: expiresAt,
    });

    // Link last offer to thread
    await negotiationRepo.updateThread(thread.id, {
      last_offer_id: offer.id,
      updated_at: new Date(),
    });

    // Broadcast realtime event
    void NegotiationRealtimeService.triggerEvent(thread.id, 'offer:created', {
      threadId: thread.id,
      offer,
    });

    return negotiationRepo.findThreadByIdWithDetails(thread.id);
  },

  /**
   * Submits a counter-offer in an existing open thread, superseding previous pending offers.
   */
  async submitCounterOffer(userId: string, threadId: string, input: CreateCounterOfferInput) {
    const threadWithDetails = await negotiationRepo.findThreadByIdWithDetails(threadId);
    if (!threadWithDetails) {
      throw new NegotiationRuleError('Negotiation thread not found', 404);
    }

    if (threadWithDetails.buyer_id !== userId && threadWithDetails.seller_id !== userId) {
      throw new NegotiationRuleError('Only thread participants can submit offers', 403);
    }

    if (threadWithDetails.status !== 'OPEN') {
      throw new NegotiationRuleError(`Cannot submit offer on a ${threadWithDetails.status.toLowerCase()} thread`, 400);
    }

    if (threadWithDetails.listing.status !== 'ACTIVE') {
      throw new NegotiationRuleError('Listing is no longer active', 400);
    }

    // Invariant: Mark previous pending offers in this thread as SUPERSEDED
    await negotiationRepo.supersedePendingOffersInThread(threadId);

    const expiresAt = new Date(Date.now() + DEFAULT_OFFER_TTL_HOURS * 60 * 60 * 1000);
    const pickupDate = input.proposedPickupAt ? new Date(input.proposedPickupAt) : null;

    const newOffer = await negotiationRepo.createOffer({
      thread_id: threadId,
      offered_by_user_id: userId,
      offer_amount_bdt: input.offerAmountBdt,
      offered_quantity: input.offeredQuantity,
      unit: input.unit || threadWithDetails.listing.unit,
      proposed_pickup_at: pickupDate,
      notes: input.notes ?? null,
      status: 'PENDING',
      expires_at: expiresAt,
    });

    await negotiationRepo.updateThread(threadId, {
      last_offer_id: newOffer.id,
      updated_at: new Date(),
    });

    void NegotiationRealtimeService.triggerEvent(threadId, 'offer:created', {
      threadId,
      offer: newOffer,
    });

    return newOffer;
  },

  /**
   * Accepts the active pending offer:
   * 1. Marks offer ACCEPTED
   * 2. Moves thread to COMPLETED
   * 3. Flips listing ACTIVE -> MATCHED
   * 4. Closes rival buyer threads on that listing as SUPERSEDED_BY_SALE
   * 5. Spawns pickup_orders record
   */
  async acceptOffer(userId: string, threadId: string) {
    const thread = await negotiationRepo.findThreadByIdWithDetails(threadId);
    if (!thread) {
      throw new NegotiationRuleError('Negotiation thread not found', 404);
    }

    if (thread.buyer_id !== userId && thread.seller_id !== userId) {
      throw new NegotiationRuleError('Only thread participants can accept offers', 403);
    }

    if (thread.status !== 'OPEN') {
      throw new NegotiationRuleError(`Cannot accept offer on a ${thread.status.toLowerCase()} thread`, 400);
    }

    const rawActiveOffer = await negotiationRepo.findActiveOfferByThread(threadId);
    if (!rawActiveOffer) {
      throw new NegotiationRuleError('No active pending offer to accept', 404);
    }

    const activeOffer = await this.checkAndExpireOffer(rawActiveOffer);
    if (activeOffer.status === 'EXPIRED') {
      throw new NegotiationRuleError('Offer has expired and cannot be accepted', 410);
    }

    if (activeOffer.offered_by_user_id === userId) {
      throw new NegotiationRuleError('Cannot accept your own offer — counterparty must accept', 400);
    }

    const listing = await listingRepo.findById(thread.listing_id);
    if (!listing || listing.status !== 'ACTIVE') {
      throw new NegotiationRuleError('Listing is no longer active and cannot be matched', 409);
    }

    // 1. Accept active offer
    const acceptedOffer = await negotiationRepo.updateOfferStatus(activeOffer.id, 'ACCEPTED');

    // 2. Complete thread
    const completedThread = await negotiationRepo.updateThread(threadId, {
      status: 'COMPLETED',
      last_offer_id: activeOffer.id,
      updated_at: new Date(),
    });

    // 3. Flip listing status ACTIVE -> MATCHED
    await listingRepo.updateStatus(listing.id, 'MATCHED');

    // 4. Supersede rival threads and their pending offers
    const { closedThreads } = await negotiationRepo.supersedeRivalsOnListing(listing.id, threadId);

    // 5. Auto-spawn a pickup_orders record
    const scheduledFor = activeOffer.proposed_pickup_at
      ? new Date(activeOffer.proposed_pickup_at)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const address = listing.thana
      ? `${listing.thana}, ${listing.zilla || 'Dhaka'}`
      : 'Dhaka, Bangladesh';

    const orderNotes = activeOffer.notes
      ? `Agreed negotiation: ${activeOffer.offered_quantity} ${activeOffer.unit} for ৳${activeOffer.offer_amount_bdt}. Notes: ${activeOffer.notes}`
      : `Agreed negotiation: ${activeOffer.offered_quantity} ${activeOffer.unit} for ৳${activeOffer.offer_amount_bdt}`;

    const pickupOrder = await pickupRepo.create({
      listing_id: listing.id,
      customer_id: thread.buyer_id,
      status: 'REQUESTED',
      address,
      lat: listing.lat ?? 23.7806,
      lng: listing.lng ?? 90.4192,
      scheduled_for: scheduledFor,
      notes: orderNotes,
    });

    // 6. Broadcast realtime events
    void NegotiationRealtimeService.triggerEvent(threadId, 'offer:accepted', {
      threadId,
      offer: acceptedOffer,
      thread: completedThread,
      pickupOrder,
    });

    for (const rival of closedThreads) {
      void NegotiationRealtimeService.triggerEvent(rival.id, 'thread:superseded', {
        threadId: rival.id,
        reason: 'Listing matched via competing negotiation',
      });
    }

    return {
      thread: completedThread,
      offer: acceptedOffer,
      pickupOrder,
    };
  },

  /**
   * Rejects the active pending offer.
   */
  async rejectOffer(userId: string, threadId: string, reason?: string) {
    const thread = await negotiationRepo.findThreadByIdWithDetails(threadId);
    if (!thread) {
      throw new NegotiationRuleError('Negotiation thread not found', 404);
    }

    if (thread.buyer_id !== userId && thread.seller_id !== userId) {
      throw new NegotiationRuleError('Only thread participants can reject offers', 403);
    }

    if (thread.status !== 'OPEN') {
      throw new NegotiationRuleError(`Cannot reject offer on a ${thread.status.toLowerCase()} thread`, 400);
    }

    const rawActiveOffer = await negotiationRepo.findActiveOfferByThread(threadId);
    if (!rawActiveOffer) {
      throw new NegotiationRuleError('No active pending offer to reject', 404);
    }

    const activeOffer = await this.checkAndExpireOffer(rawActiveOffer);
    if (activeOffer.status === 'EXPIRED') {
      throw new NegotiationRuleError('Offer has already expired', 410);
    }

    if (activeOffer.offered_by_user_id === userId) {
      throw new NegotiationRuleError('Cannot reject your own offer — counterparty must reject', 400);
    }

    const rejectedOffer = await negotiationRepo.updateOfferStatus(activeOffer.id, 'REJECTED');

    await negotiationRepo.updateThread(threadId, {
      updated_at: new Date(),
    });

    void NegotiationRealtimeService.triggerEvent(threadId, 'offer:rejected', {
      threadId,
      offer: rejectedOffer,
      reason: reason ?? null,
    });

    return rejectedOffer;
  },

  /**
   * Retrieves thread by ID with all details, lazily expiring any past-due pending offer.
   */
  async getThreadById(userId: string, threadId: string, userRole?: string) {
    const thread = await negotiationRepo.findThreadByIdWithDetails(threadId);
    if (!thread) {
      throw new NegotiationRuleError('Negotiation thread not found', 404);
    }

    if (thread.buyer_id !== userId && thread.seller_id !== userId && userRole !== 'ADMIN') {
      throw new NegotiationRuleError('Forbidden: you are not a participant in this negotiation', 403);
    }

    // Lazily evaluate expiration of any pending offer
    const activeOffer = thread.offers.find((o) => o.status === 'PENDING');
    if (activeOffer) {
      const checked = await this.checkAndExpireOffer(activeOffer);
      if (checked.status !== 'PENDING') {
        activeOffer.status = checked.status;
      }
    }

    return thread;
  },

  /**
   * Lists all negotiation threads for a user.
   */
  async listThreadsForUser(userId: string, status?: string) {
    return negotiationRepo.findThreadsByUser(userId, status);
  },
};
