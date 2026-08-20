// PartnerDomain: partner application and verification lifecycle.
import { partnerRepo } from '@/lib/repos/partners';
import { userRepo } from '@/lib/repos/users';
import type { PartnerStatus } from '@chokro/shared';

const PARTNER_STATUS_TRANSITIONS: Record<string, string[]> = {
  APPLIED: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['REJECTED'],
  REJECTED: ['APPLIED'],
};

export interface ApplyPartnerDomainInput {
  userId: string;
  orgName: string;
  types: string[];
  eWasteLicensed?: boolean;
  doeLicenseDoc?: string | null;
  capabilityFlags?: Record<string, boolean>;
}

export const PartnerDomain = {
  isValidStatusTransition(currentStatus: string, targetStatus: string): boolean {
    return PARTNER_STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
  },

  async apply(input: ApplyPartnerDomainInput) {
    if (input.eWasteLicensed && !input.doeLicenseDoc) {
      throw new Error('DoE License document is mandatory for e-waste licensing.');
    }

    const existing = await partnerRepo.findByUserId(input.userId);
    if (existing) {
      if (existing.status === 'VERIFIED') {
        throw new Error('User already has a verified partner application');
      }
      // Re-application or update of pending/rejected application (updates the single row)
      return partnerRepo.reapply(existing.id, {
        user_id: input.userId,
        org_name: input.orgName,
        types: input.types,
        e_waste_licensed: false,
        doe_license_doc: input.doeLicenseDoc || null,
        status: 'APPLIED',
        capability_flags: input.capabilityFlags || {},
      });
    }

    return partnerRepo.apply({
      user_id: input.userId,
      org_name: input.orgName,
      types: input.types,
      e_waste_licensed: false,
      doe_license_doc: input.doeLicenseDoc || null,
      status: 'APPLIED',
      capability_flags: input.capabilityFlags || {},
    });
  },

  async getPartnerById(id: string) {
    return partnerRepo.findById(id);
  },

  async getPartnerByUserId(userId: string) {
    return partnerRepo.findByUserId(userId);
  },

  async listAllPartners() {
    return partnerRepo.findAll();
  },

  async updateVerification(
    id: string,
    status: PartnerStatus | string,
    eWasteLicensed?: boolean,
    reason?: string | null
  ) {
    const existing = await partnerRepo.findById(id);
    if (!existing) {
      throw new Error('Partner not found');
    }

    if (!this.isValidStatusTransition(existing.status, status)) {
      throw new Error(`Invalid partner status transition from ${existing.status} to ${status}`);
    }

    const updated = await partnerRepo.updateVerification(id, status, eWasteLicensed, reason);

    // Promote user account to PARTNER role upon verification; reset to INDIVIDUAL if rejected
    if (status === 'VERIFIED') {
      await userRepo.updateRole(existing.user_id, 'PARTNER');
    } else if (status === 'REJECTED') {
      await userRepo.updateRole(existing.user_id, 'INDIVIDUAL');
    }

    return updated;
  },

  async updateCapabilities(id: string, capabilityFlags: Record<string, boolean>) {
    const existing = await partnerRepo.findById(id);
    if (!existing) {
      throw new Error('Partner not found');
    }
    return partnerRepo.updateCapabilities(id, capabilityFlags);
  },
};
