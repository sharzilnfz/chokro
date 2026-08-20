// ListingDomain: listing lifecycle rules — legal status transitions, ownership
// checks, and the published-catalog queries used by the marketplace.
//
// Listing repo + shared catalogue types that back these operations.
import { listingRepo, ListingFilter } from '@/lib/repos/listings';
import { ListingStatus, type Category, type Condition, type Unit } from '@chokro/shared';

// Legal lifecycle edges a listing may traverse.
const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['CANCELLED'],
  CANCELLED: [],
};

// Creation payload; status is optional and defaults to ACTIVE downstream.
export interface CreateListingData {
  category: Category;
  unit: Unit;
  declaredWeight?: number | null;
  pieceCount?: number | null;
  declaredCondition: Condition;
  price: number;
  photos: string[];
  status?: ListingStatus;
}

// Application rules for creating, advancing, and browsing listings.
export const ListingDomain = {
  // Gate: only legal status edges may be applied.
  isValidTransition(currentStatus: string, targetStatus: string): boolean {
    return TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
  },

  // Authorization: the listing's owner, or any ADMIN, may act on it.
  isOwnerOrAdmin(listing: { owner_id: string }, userId: string, userRole: string): boolean {
    return listing.owner_id === userId || userRole === 'ADMIN';
  },

  // Single listing lookup by primary key.
  async getListingById(id: string) {
    return listingRepo.findById(id);
  },

  // Publish a new listing on the owner's behalf, normalizing numeric scale to a string column.
  async createListing(ownerId: string, data: CreateListingData) {
    return listingRepo.create({
      owner_id: ownerId,
      category: data.category,
      unit: data.unit,
      declared_weight: data.declaredWeight != null ? String(data.declaredWeight) : null,
      piece_count: data.pieceCount ?? null,
      declared_condition: data.declaredCondition,
      price_bdt: data.price,
      photos: data.photos,
      status: data.status || 'ACTIVE',
    });
  },

  // Advance a listing through its lifecycle, validating the edge before persisting it.
  async updateListingStatus(id: string, targetStatus: ListingStatus, currentStatus?: string) {
    // When the caller omits the source status, resolve it from the DB so the
    // transition is always checked against persisted state.
    let sourceStatus = currentStatus;
    if (!sourceStatus) {
      const existing = await listingRepo.findById(id);
      if (!existing) {
        throw new Error('Listing not found');
      }
      sourceStatus = existing.status;
    }

    // Reject illegal jumps before writing.
    if (!this.isValidTransition(sourceStatus, targetStatus)) {
      throw new Error(`Invalid status transition from ${sourceStatus} to ${targetStatus}`);
    }

    return listingRepo.updateStatus(id, targetStatus);
  },

  // Every listing filed by a given seller, newest first.
  async getListingsByOwner(ownerId: string) {
    return listingRepo.findByOwner(ownerId);
  },

  // Public catalog browse: channels any visitor-supplied filters and paging cursor through.
  async findPublished(filter?: ListingFilter) {
    return listingRepo.findPublished(filter);
  },
};
