import { partnerRepo } from '@/lib/repos/partners';
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
      throw new Error('User already has a partner application');
    }

    // SPEC 00 §2.5: e_waste_licensed capability is granted only by an admin during verification
    return partnerRepo.apply({
      user_id: input.userId,
      org_name: input.orgName,
      types: input.types,
      e_waste_licensed: false,
      doe_license_doc: input.doeLicenseDoc || null,
      status: 'APPLIED',
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

  async updateVerification(id: string, status: PartnerStatus | string, eWasteLicensed?: boolean) {
    const existing = await partnerRepo.findById(id);
    if (!existing) {
      throw new Error('Partner not found');
    }

    if (!this.isValidStatusTransition(existing.status, status)) {
      throw new Error(`Invalid partner status transition from ${existing.status} to ${status}`);
    }

    return partnerRepo.updateVerification(id, status, eWasteLicensed);
  },
};
