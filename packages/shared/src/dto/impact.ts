// Shared DTOs, interfaces, and Zod schemas for Impact Ledger, ESG Certificates, and Institutional Sponsorship (SPEC 14 / Ticket 10)
import { z } from 'zod';
import { CategoryEnum, PathEnum, type Category, type Path } from '../enums';

// 1. Impact Record DTO
export interface ImpactRecord {
  id: string;
  custody_type: 'DEPOSIT' | 'PICKUP' | 'MANUAL' | string;
  custody_id: string;
  trust_decision_id: string;
  user_id: string;
  institution_id?: string | null;
  category: Category | string;
  next_life_path: Path | string;
  mass_kg: number | string;
  avoided_co2e_kg: number | string;
  factor_version: string;
  created_at: Date | string;
}

// 2. Emission Factor DTO
export interface EmissionFactor {
  id?: string;
  category: Category | string;
  next_life_path: Path | string;
  factor_co2e_per_kg: number | string;
  range_low: number | string;
  range_high: number | string;
  source: string;
  version: string;
  effective_from?: Date | string;
  created_at?: Date | string;
}

export const CreateEmissionFactorSchema = z.object({
  category: CategoryEnum,
  nextLifePath: PathEnum,
  factorCo2ePerKg: z.number().positive(),
  rangeLow: z.number().positive(),
  rangeHigh: z.number().positive(),
  source: z.string().min(1),
  version: z.string().min(1),
});
export type CreateEmissionFactorInput = z.infer<typeof CreateEmissionFactorSchema>;

// 3. Institution Account DTO
export interface InstitutionAccount {
  id: string;
  campus_id: string;
  invite_code: string;
  contact_email: string;
  total_diverted_kg: number | string;
  created_at: Date | string;
}

// 4. Sustainability Certificate DTO & Creation Schema
export interface SustainabilityCertificate {
  id: string;
  institution_id: string;
  certificate_ref: string;
  period_start: Date | string;
  period_end: Date | string;
  total_mass_kg: number | string;
  total_co2e_kg: number | string;
  covered_record_ids: string[];
  signature_hash: string;
  issued_at: Date | string;
}

export const GenerateCertificateSchema = z.object({
  institutionId: z.string().uuid(),
  periodStart: z.union([z.string(), z.date()]),
  periodEnd: z.union([z.string(), z.date()]),
});
export type GenerateCertificateInput = z.infer<typeof GenerateCertificateSchema>;

// 5. Sponsorship Pool DTO & Creation Schema
export interface SponsorshipPool {
  id: string;
  institution_id: string;
  total_budget_bdt: number | string;
  remaining_budget_bdt: number | string;
  monthly_draw_cap_bdt: number | string;
  created_at: Date | string;
}

export const CreateSponsorshipPoolSchema = z.object({
  institutionId: z.string().uuid(),
  totalBudgetBdt: z.number().positive(),
  monthlyDrawCapBdt: z.number().positive(),
});
export type CreateSponsorshipPoolInput = z.infer<typeof CreateSponsorshipPoolSchema>;

// 6. Personal Impact Summary (M16)
export interface CategoryImpactBreakdown {
  category: string;
  massKg: number;
  avoidedCo2eKg: number;
  count: number;
}

export interface PathImpactBreakdown {
  path: string;
  massKg: number;
  avoidedCo2eKg: number;
  count: number;
}

export interface PersonalImpactSummary {
  userId: string;
  totalDivertedKg: number;
  totalAvoidedCo2eKg: number;
  byCategory: CategoryImpactBreakdown[];
  byPath: PathImpactBreakdown[];
  comparisons: {
    treeEquivalents: number;
    kmDrivenAvoided: number;
    smartphoneCharges: number;
  };
  records: ImpactRecord[];
  methodologyBasis: string;
}

// 7. Institutional Impact Summary
export interface InstitutionImpactSummary {
  institution: {
    id: string;
    name: string;
    slug: string;
  };
  totalDivertedKg: number;
  totalAvoidedCo2eKg: number;
  activeMemberCount: number;
  byCategory: Array<{
    category: string;
    massKg: number;
    avoidedCo2eKg: number;
    percentage: number;
  }>;
  byPath: Array<{
    path: string;
    massKg: number;
    avoidedCo2eKg: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    massKg: number;
    avoidedCo2eKg: number;
  }>;
  sponsorshipPool?: {
    totalBudgetBdt: number;
    remainingBudgetBdt: number;
    monthlyDrawCapBdt: number;
    costPerKgDiverted: number;
    costPerTonneCo2eAvoided: number;
    isNearExhaustion: boolean;
  } | null;
  records: ImpactRecord[];
}

// 8. Public Certificate View (M17)
export interface PublicCertificateView {
  certificateRef: string;
  institutionName: string;
  campusSlug: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  issuedAt: Date | string;
  totalMassKg: number;
  totalCo2eKg: number;
  recordCount: number;
  methodology: {
    factorVersion: string;
    sources: string[];
    basisStatement: string;
    uncertaintyRange: {
      rangeLowCo2eKg: number;
      rangeHighCo2eKg: number;
    };
  };
  breakdown: {
    byCategory: Array<{
      category: string;
      massKg: number;
      avoidedCo2eKg: number;
    }>;
    byPath: Array<{
      path: string;
      massKg: number;
      avoidedCo2eKg: number;
    }>;
    ewasteCount: number;
    licensedDestinations: string[];
  };
  signatureHash: string;
  verificationStatus: 'VERIFIED_AUTHENTIC' | string;
}

// 9. DoE E-Waste Regulatory Compliance Report
export interface EwasteComplianceItem {
  impactRecordId: string;
  custodyId: string;
  custodyType: string;
  category: string;
  massKg: number;
  destinationPartnerName: string;
  destinationDoeLicenseDoc: string | null;
  isLicensedPartner: boolean;
  trustDecisionId: string;
  decidedBy: string;
  decidedAt: Date | string;
  chainComplete: boolean;
}

export interface EwasteComplianceReport {
  institutionId?: string | null;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  items: EwasteComplianceItem[];
  totalItems: number;
  totalMassKg: number;
  licensedPartnerPercentage: number;
  unlicensedDisposalsCount: number;
  flaggedGapsCount: number;
}
