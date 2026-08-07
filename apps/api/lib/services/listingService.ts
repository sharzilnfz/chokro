import { listingRepo } from '@/lib/repos/listings';
import { ListingStatus } from '@chokro/shared';

const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['CANCELLED'],
  CANCELLED: [],
};

export const listingService = {
  isValidTransition(currentStatus: string, targetStatus: string): boolean {
    return TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
  },

  isOwnerOrAdmin(listing: { owner_id: string }, userId: string, userRole: string): boolean {
    return listing.owner_id === userId || userRole === 'ADMIN';
  },

  async getListingById(id: string) {
    return listingRepo.findById(id);
  },

  async createListing(ownerId: string, data: {
    category: any;
    unit: any;
    declaredWeight?: number | null;
    pieceCount?: number | null;
    declaredCondition: any;
    photos: string[];
    status: ListingStatus;
  }) {
    return listingRepo.create({
      owner_id: ownerId,
      category: data.category,
      unit: data.unit,
      declared_weight: data.declaredWeight?.toString() ?? null,
      piece_count: data.pieceCount ?? null,
      declared_condition: data.declaredCondition,
      photos: data.photos,
      status: data.status,
    });
  },

  async updateListingStatus(id: string, status: ListingStatus) {
    return listingRepo.updateStatus(id, status);
  },

  async getListingsByOwner(ownerId: string) {
    return listingRepo.findByOwnerId(ownerId);
  },
};
