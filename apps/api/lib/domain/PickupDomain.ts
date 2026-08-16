import { pickupRepo } from '@/lib/repos/pickups';
import { partnerRepo } from '@/lib/repos/partners';

const TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE: ['COLLECTED'],
  COLLECTED: [],
  CANCELLED: [],
};

export const PickupDomain = {
  canTransition(currentStatus: string, targetStatus: string): boolean {
    return TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
  },

  assertTransition(currentStatus: string, targetStatus: string): void {
    if (!this.canTransition(currentStatus, targetStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${targetStatus}`);
    }
  },

  isCustomer(order: { customer_id: string }, userId: string): boolean {
    return order.customer_id === userId;
  },

  // The caller is the collector only when they own the partner record assigned to this order.
  async isAssignedCollector(order: { collector_partner_id: string | null }, userId: string): Promise<boolean> {
    if (!order.collector_partner_id) return false;
    const partner = await partnerRepo.findById(order.collector_partner_id);
    return partner?.user_id === userId;
  },

  async getPickupById(id: string) {
    return pickupRepo.findById(id);
  },
};
