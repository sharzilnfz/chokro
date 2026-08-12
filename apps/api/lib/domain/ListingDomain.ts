import { listingRepo, ListingFilter } from '@/lib/repos/listings';
import { ListingStatus } from '@chokro/shared';

const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['CANCELLED'],
  CANCELLED: [],
};

export interface CreateListingData {
  category: any;
  unit: any;
  declaredWeight?: number | null;
  pieceCount?: number | null;
  declaredCondition: any;
  photos: string[];
  status?: ListingStatus;
}

export const ListingDomain = {
  isValidTransition(currentStatus: string, targetStatus: string): boolean {
    return TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
  },

  isOwnerOrAdmin(listing: { owner_id: string }, userId: string, userRole: string): boolean {
    return listing.owner_id === userId || userRole === 'ADMIN';
  },

  async getListingById(id: string) {
    return listingRepo.findById(id);
  },

  async createListing(ownerId: string, data: CreateListingData) {
    return listingRepo.create({
      owner_id: ownerId,
      category: data.category,
      unit: data.unit,
      declared_weight: data.declaredWeight != null ? String(data.declaredWeight) : null,
      piece_count: data.pieceCount ?? null,
      declared_condition: data.declaredCondition,
      photos: data.photos,
      status: data.status || 'ACTIVE',
    });
  },

  async updateListingStatus(id: string, targetStatus: ListingStatus, currentStatus?: string) {
    let sourceStatus = currentStatus;
    if (!sourceStatus) {
      const existing = await listingRepo.findById(id);
      if (!existing) {
        throw new Error('Listing not found');
      }
      sourceStatus = existing.status;
    }

    if (!this.isValidTransition(sourceStatus, targetStatus)) {
      throw new Error(`Invalid status transition from ${sourceStatus} to ${targetStatus}`);
    }

    return listingRepo.updateStatus(id, targetStatus);
  },

  async getListingsByOwner(ownerId: string) {
    return listingRepo.findByOwnerId(ownerId);
  },

  async findPublished(filter?: ListingFilter) {
    return listingRepo.findPublished(filter);
  },
};
