// listingService: route-facing facade that delegates listing operations to
// ListingDomain so handlers depend on services, not domain internals.
//
// Domain rules, shared status enum, and browse-filter type this facade forwards.
import { ListingDomain, CreateListingData } from '@/lib/domain/ListingDomain';
import { ListingStatus } from '@chokro/shared';
import type { ListingFilter } from '@/lib/repos/listings';

export const listingService = {
  // Status-transition guard.
  isValidTransition(currentStatus: string, targetStatus: string): boolean {
    return ListingDomain.isValidTransition(currentStatus, targetStatus);
  },

  // Owner-or-admin authorization check.
  isOwnerOrAdmin(listing: { owner_id: string }, userId: string, userRole: string): boolean {
    return ListingDomain.isOwnerOrAdmin(listing, userId, userRole);
  },

  // Single listing lookup by primary key.
  async getListingById(id: string) {
    return ListingDomain.getListingById(id);
  },

  // Create a listing on the owner's behalf.
  async createListing(ownerId: string, data: CreateListingData) {
    return ListingDomain.createListing(ownerId, data);
  },

  // Advance a listing to a new status, optionally given its current one.
  async updateListingStatus(id: string, status: ListingStatus, currentStatus?: string) {
    return ListingDomain.updateListingStatus(id, status, currentStatus);
  },

  // A seller's own listings.
  async getListingsByOwner(ownerId: string) {
    return ListingDomain.getListingsByOwner(ownerId);
  },

  // Public catalog browse with filters and paging.
  async findPublished(filter?: ListingFilter) {
    return ListingDomain.findPublished(filter);
  },
};
