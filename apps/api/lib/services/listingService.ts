import { ListingDomain, CreateListingData } from '@/lib/domain/ListingDomain';
import { ListingStatus } from '@chokro/shared';

export const listingService = {
  isValidTransition(currentStatus: string, targetStatus: string): boolean {
    return ListingDomain.isValidTransition(currentStatus, targetStatus);
  },

  isOwnerOrAdmin(listing: { owner_id: string }, userId: string, userRole: string): boolean {
    return ListingDomain.isOwnerOrAdmin(listing, userId, userRole);
  },

  async getListingById(id: string) {
    return ListingDomain.getListingById(id);
  },

  async createListing(ownerId: string, data: CreateListingData) {
    return ListingDomain.createListing(ownerId, data);
  },

  async updateListingStatus(id: string, status: ListingStatus, currentStatus?: string) {
    return ListingDomain.updateListingStatus(id, status, currentStatus);
  },

  async getListingsByOwner(ownerId: string) {
    return ListingDomain.getListingsByOwner(ownerId);
  },

  async findPublished(filter?: any) {
    return ListingDomain.findPublished(filter);
  },
};
