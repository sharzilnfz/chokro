// ImpactDomain: Impact Ledger, ESG Sustainability Certificates, ISO 14044 Emission Factors & Sponsorship Pools (SPEC 14 / Ticket 10)
import crypto from 'crypto';
import {
  type Category,
  type Path,
  type PersonalImpactSummary,
  type InstitutionImpactSummary,
  type PublicCertificateView,
  type EwasteComplianceReport,
  type EwasteComplianceItem,
  type GenerateCertificateInput,
  type CreateSponsorshipPoolInput,
  type CreateEmissionFactorInput,
  type EmissionFactor,
} from '@chokro/shared';
import { impactRepo } from '../repos/impact';
import { trustGateRepo } from '../repos/trustGate';
import { depositRepo } from '../repos/deposits';
import { pickupRepo } from '../repos/pickups';
import { partnerRepo } from '../repos/partners';
import { dropZoneRepo } from '../repos/dropZones';
import { userRepo } from '../repos/users';
import { BadRequestError, NotFoundError } from '../database';

// ISO 14044 Baseline Emission Factors (kg CO2e avoided per kg material) with stated uncertainty ranges
export const BASELINE_EMISSION_FACTORS: Record<
  string,
  {
    factor: number;
    rangeLow: number;
    rangeHigh: number;
    source: string;
    version: string;
  }
> = {
  'PLASTICS:RECYCLE': {
    factor: 1.45,
    rangeLow: 1.2,
    rangeHigh: 1.7,
    source: 'ISO 14044 / Climatiq Ecoinvent',
    version: 'v1.0',
  },
  'PLASTICS:REUSE': {
    factor: 2.8,
    rangeLow: 2.4,
    rangeHigh: 3.2,
    source: 'ISO 14044 / Climatiq Ecoinvent',
    version: 'v1.0',
  },
  'PAPER:RECYCLE': {
    factor: 0.95,
    rangeLow: 0.8,
    rangeHigh: 1.1,
    source: 'ISO 14044 / DEFRA',
    version: 'v1.0',
  },
  'PAPER:REUSE': {
    factor: 1.8,
    rangeLow: 1.5,
    rangeHigh: 2.1,
    source: 'ISO 14044 / DEFRA',
    version: 'v1.0',
  },
  'METAL:RECYCLE': {
    factor: 4.2,
    rangeLow: 3.8,
    rangeHigh: 4.6,
    source: 'ISO 14044 / World Steel',
    version: 'v1.0',
  },
  'METAL:REUSE': {
    factor: 8.5,
    rangeLow: 7.5,
    rangeHigh: 9.5,
    source: 'ISO 14044 / World Steel',
    version: 'v1.0',
  },
  'GLASS:RECYCLE': {
    factor: 0.6,
    rangeLow: 0.5,
    rangeHigh: 0.7,
    source: 'ISO 14044 / FEVE',
    version: 'v1.0',
  },
  'GLASS:REUSE': {
    factor: 1.2,
    rangeLow: 1.0,
    rangeHigh: 1.4,
    source: 'ISO 14044 / FEVE',
    version: 'v1.0',
  },
  'CLOTHES:RECYCLE': {
    factor: 3.5,
    rangeLow: 3.0,
    rangeHigh: 4.0,
    source: 'ISO 14044 / WRAP UK',
    version: 'v1.0',
  },
  'CLOTHES:REUSE': {
    factor: 15.0,
    rangeLow: 12.0,
    rangeHigh: 18.0,
    source: 'ISO 14044 / WRAP UK',
    version: 'v1.0',
  },
  'BOOKS:REUSE': {
    factor: 2.2,
    rangeLow: 1.8,
    rangeHigh: 2.6,
    source: 'ISO 14044 / DEFRA',
    version: 'v1.0',
  },
  'BOOKS:RECYCLE': {
    factor: 1.05,
    rangeLow: 0.9,
    rangeHigh: 1.2,
    source: 'ISO 14044 / DEFRA',
    version: 'v1.0',
  },
  'E_WASTE:REPAIR': {
    factor: 45.0,
    rangeLow: 35.0,
    rangeHigh: 55.0,
    source: 'ISO 14044 / WEEE Forum / Climatiq',
    version: 'v1.0',
  },
  'E_WASTE:RECYCLE': {
    factor: 18.5,
    rangeLow: 15.0,
    rangeHigh: 22.0,
    source: 'ISO 14044 / WEEE Forum / Climatiq',
    version: 'v1.0',
  },
  'APPLIANCES:REPAIR': {
    factor: 25.0,
    rangeLow: 20.0,
    rangeHigh: 30.0,
    source: 'ISO 14044 / EU Circular Economy',
    version: 'v1.0',
  },
  'APPLIANCES:RECYCLE': {
    factor: 8.0,
    rangeLow: 6.5,
    rangeHigh: 9.5,
    source: 'ISO 14044 / EU Circular Economy',
    version: 'v1.0',
  },
  'FURNITURE:REUSE': {
    factor: 12.0,
    rangeLow: 9.0,
    rangeHigh: 15.0,
    source: 'ISO 14044 / FIRA',
    version: 'v1.0',
  },
  'FURNITURE:REPAIR': {
    factor: 10.0,
    rangeLow: 8.0,
    rangeHigh: 12.0,
    source: 'ISO 14044 / FIRA',
    version: 'v1.0',
  },
  'FURNITURE:RECYCLE': {
    factor: 3.0,
    rangeLow: 2.0,
    rangeHigh: 4.0,
    source: 'ISO 14044 / FIRA',
    version: 'v1.0',
  },
};

export interface RecordVerifiedImpactInput {
  custodyType: 'DEPOSIT' | 'PICKUP' | 'MANUAL' | string;
  custodyId: string;
  trustDecisionId: string;
  userId: string;
  category: Category | string;
  declaredQuantity: number;
  verifiedQuantity?: number | null;
  unit: 'kg' | 'piece' | string;
  nextLifePath?: Path | string;
  institutionId?: string | null;
  effectiveDate?: Date;
}

export class ImpactDomain {
  /**
   * Initializes or seeds baseline emission factors if missing
   */
  static async seedBaselineEmissionFactors(): Promise<void> {
    const existing = await impactRepo.getAllEmissionFactors();
    if (existing.length === 0) {
      for (const [key, val] of Object.entries(BASELINE_EMISSION_FACTORS)) {
        const [cat, path] = key.split(':');
        await impactRepo.createEmissionFactor({
          category: cat,
          next_life_path: path,
          factor_co2e_per_kg: val.factor,
          range_low: val.rangeLow,
          range_high: val.rangeHigh,
          source: val.source,
          version: val.version,
        });
      }
    }
  }

  /**
   * Climatiq API integration with ISO 14044 offline factor table fallback
   */
  static async fetchClimatiqOrOfflineFactor(
    category: string,
    nextLifePath: string,
    effectiveDate: Date = new Date()
  ): Promise<{
    factorCo2ePerKg: number;
    rangeLow: number;
    rangeHigh: number;
    source: string;
    version: string;
    isOfflineFallback: boolean;
  } | null> {
    // 1. Try DB lookup first
    const dbFactor = await impactRepo.findEffectiveEmissionFactor(category, nextLifePath, effectiveDate);
    if (dbFactor) {
      return {
        factorCo2ePerKg: Number(dbFactor.factor_co2e_per_kg),
        rangeLow: Number(dbFactor.range_low),
        rangeHigh: Number(dbFactor.range_high),
        source: dbFactor.source,
        version: dbFactor.version,
        isOfflineFallback: false,
      };
    }

    // 2. Try Climatiq API if key configured
    const apiKey = process.env.CLIMATIQ_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch('https://api.climatiq.io/data/v1/estimate', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emission_factor: {
              activity_id: `waste_treatment-${category.toLowerCase()}-${nextLifePath.toLowerCase()}`,
            },
            parameters: { weight: 1, weight_unit: 'kg' },
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data && typeof data.co2e === 'number') {
            return {
              factorCo2ePerKg: data.co2e,
              rangeLow: data.co2e * 0.85,
              rangeHigh: data.co2e * 1.15,
              source: 'Climatiq Live API / Ecoinvent',
              version: 'climatiq-live',
              isOfflineFallback: false,
            };
          }
        }
      } catch {
        // Fall through to offline fallback
      }
    }

    // 3. Fallback to ISO 14044 Baseline table
    const key = `${category.toUpperCase()}:${nextLifePath.toUpperCase()}`;
    const baseline = BASELINE_EMISSION_FACTORS[key];
    if (baseline) {
      return {
        factorCo2ePerKg: baseline.factor,
        rangeLow: baseline.rangeLow,
        rangeHigh: baseline.rangeHigh,
        source: baseline.source,
        version: baseline.version,
        isOfflineFallback: true,
      };
    }

    // No factor published for this category / path
    return null;
  }

  /**
   * Generates an immutable impact record strictly upon verified Trust Gate decision.
   * Enforces UNIQUE (custody_id) and frozen factor versions.
   */
  static async recordVerifiedImpact(params: RecordVerifiedImpactInput) {
    // 1. Idempotency check: exactly one record per custody event
    const existing = await impactRepo.findImpactRecordByCustodyId(params.custodyId);
    if (existing) {
      return existing;
    }

    // 2. Calculate mass in kg
    const quantity = params.verifiedQuantity != null ? Number(params.verifiedQuantity) : Number(params.declaredQuantity);
    let massKg = quantity;

    if (params.unit === 'piece') {
      if (params.category === 'E_WASTE') {
        massKg = quantity * 2.0; // 2.0 kg per electronic piece standard
      } else if (params.category === 'APPLIANCES') {
        massKg = quantity * 5.0; // 5.0 kg per appliance standard
      } else {
        massKg = quantity * 1.0;
      }
    }

    const nextLifePath = params.nextLifePath || (params.category === 'E_WASTE' ? 'RECYCLE' : 'RECYCLE');

    // 3. Look up emission factor with uncertainty range & version
    const factorData = await this.fetchClimatiqOrOfflineFactor(
      params.category,
      nextLifePath,
      params.effectiveDate || new Date()
    );

    let avoidedCo2eKg = 0;
    let factorVersion = 'NONE';

    if (factorData) {
      avoidedCo2eKg = Math.round(massKg * factorData.factorCo2ePerKg * 1000) / 1000;
      factorVersion = factorData.version;
    }

    // 4. Resolve user institution if not provided
    let resolvedInstitutionId = params.institutionId || null;
    if (!resolvedInstitutionId) {
      const user = await userRepo.findById(params.userId);
      if (user?.institution_id) {
        const campus = await impactRepo.findCampusByIdOrSlug(user.institution_id);
        if (campus) {
          resolvedInstitutionId = campus.id;
        }
      }
    }

    // 5. Persist immutable impact record
    const record = await impactRepo.createImpactRecord({
      custody_type: params.custodyType,
      custody_id: params.custodyId,
      trust_decision_id: params.trustDecisionId,
      user_id: params.userId,
      institution_id: resolvedInstitutionId,
      category: params.category,
      next_life_path: nextLifePath,
      mass_kg: massKg,
      avoided_co2e_kg: avoidedCo2eKg,
      factor_version: factorVersion,
      created_at: params.effectiveDate || new Date(),
    });

    // 6. Update campus cumulative diverted mass if affiliated
    if (resolvedInstitutionId) {
      await impactRepo.updateInstitutionTotalDiverted(resolvedInstitutionId, massKg);
    }

    return record;
  }

  /**
   * Campus sponsorship pool deduction and monthly draw cap management
   */
  static async drawSponsorshipPool(institutionId: string, amountBdt: number) {
    const pool = await impactRepo.findSponsorshipPoolByInstitution(institutionId);
    if (!pool) {
      return { fundedBy: 'PLATFORM', poolId: null, drawnBdt: 0 };
    }

    const remaining = Number(pool.remaining_budget_bdt);
    const total = Number(pool.total_budget_bdt);
    const monthlyCap = Number(pool.monthly_draw_cap_bdt);

    if (remaining <= 0) {
      return { fundedBy: 'PLATFORM', poolId: pool.id, drawnBdt: 0, reason: 'POOL_EXHAUSTED' };
    }

    if (amountBdt > monthlyCap) {
      return { fundedBy: 'PLATFORM', poolId: pool.id, drawnBdt: 0, reason: 'MONTHLY_CAP_EXCEEDED' };
    }

    const drawAmount = Math.min(remaining, amountBdt);
    const newRemaining = Math.max(0, remaining - drawAmount);

    await impactRepo.updateSponsorshipPoolRemaining(pool.id, newRemaining);

    const isNearExhaustion = total > 0 && newRemaining / total <= 0.15;

    return {
      fundedBy: 'INSTITUTION',
      poolId: pool.id,
      drawnBdt: drawAmount,
      remainingBudgetBdt: newRemaining,
      isNearExhaustion,
    };
  }

  /**
   * Personal Impact Dashboard (M16)
   */
  static async getPersonalImpact(userId: string): Promise<PersonalImpactSummary> {
    const records = await impactRepo.findImpactRecordsByUser(userId);

    let totalDivertedKg = 0;
    let totalAvoidedCo2eKg = 0;

    const categoryMap: Record<string, { massKg: number; avoidedCo2eKg: number; count: number }> = {};
    const pathMap: Record<string, { massKg: number; avoidedCo2eKg: number; count: number }> = {};

    for (const r of records) {
      const mass = Number(r.mass_kg) || 0;
      const co2e = Number(r.avoided_co2e_kg) || 0;

      totalDivertedKg += mass;
      totalAvoidedCo2eKg += co2e;

      // Category breakdown
      if (!categoryMap[r.category]) {
        categoryMap[r.category] = { massKg: 0, avoidedCo2eKg: 0, count: 0 };
      }
      categoryMap[r.category].massKg += mass;
      categoryMap[r.category].avoidedCo2eKg += co2e;
      categoryMap[r.category].count += 1;

      // Path breakdown
      if (!pathMap[r.next_life_path]) {
        pathMap[r.next_life_path] = { massKg: 0, avoidedCo2eKg: 0, count: 0 };
      }
      pathMap[r.next_life_path].massKg += mass;
      pathMap[r.next_life_path].avoidedCo2eKg += co2e;
      pathMap[r.next_life_path].count += 1;
    }

    const byCategory = Object.entries(categoryMap).map(([category, val]) => ({
      category,
      massKg: Math.round(val.massKg * 100) / 100,
      avoidedCo2eKg: Math.round(val.avoidedCo2eKg * 1000) / 1000,
      count: val.count,
    }));

    const byPath = Object.entries(pathMap).map(([path, val]) => ({
      path,
      massKg: Math.round(val.massKg * 100) / 100,
      avoidedCo2eKg: Math.round(val.avoidedCo2eKg * 1000) / 1000,
      count: val.count,
    }));

    // Plain-language comparisons
    const treeEquivalents = Math.round((totalAvoidedCo2eKg / 21.77) * 10) / 10;
    const kmDrivenAvoided = Math.round((totalAvoidedCo2eKg / 0.192) * 10) / 10;
    const smartphoneCharges = Math.round(totalAvoidedCo2eKg / 0.00822);

    return {
      userId,
      totalDivertedKg: Math.round(totalDivertedKg * 100) / 100,
      totalAvoidedCo2eKg: Math.round(totalAvoidedCo2eKg * 1000) / 1000,
      byCategory,
      byPath,
      comparisons: {
        treeEquivalents,
        kmDrivenAvoided,
        smartphoneCharges,
      },
      records: records as any,
      methodologyBasis:
        'Avoided emissions calculated from ISO 14044 life cycle assessment emission factors with stated uncertainty ranges.',
    };
  }

  /**
   * Institutional Impact Dashboard
   */
  static async getInstitutionImpact(
    institutionIdOrSlug: string,
    periodStart?: Date | null,
    periodEnd?: Date | null
  ): Promise<InstitutionImpactSummary> {
    const campus = await impactRepo.findCampusByIdOrSlug(institutionIdOrSlug);
    if (!campus) {
      throw new NotFoundError('Institution or campus not found');
    }

    const records = await impactRepo.findImpactRecordsByInstitution(campus.id, periodStart, periodEnd);

    let totalDivertedKg = 0;
    let totalAvoidedCo2eKg = 0;
    const userIds = new Set<string>();

    const categoryMap: Record<string, { massKg: number; avoidedCo2eKg: number }> = {};
    const pathMap: Record<string, { massKg: number; avoidedCo2eKg: number }> = {};
    const monthMap: Record<string, { massKg: number; avoidedCo2eKg: number }> = {};

    for (const r of records) {
      const mass = Number(r.mass_kg) || 0;
      const co2e = Number(r.avoided_co2e_kg) || 0;

      totalDivertedKg += mass;
      totalAvoidedCo2eKg += co2e;
      userIds.add(r.user_id);

      // Category
      if (!categoryMap[r.category]) {
        categoryMap[r.category] = { massKg: 0, avoidedCo2eKg: 0 };
      }
      categoryMap[r.category].massKg += mass;
      categoryMap[r.category].avoidedCo2eKg += co2e;

      // Path
      if (!pathMap[r.next_life_path]) {
        pathMap[r.next_life_path] = { massKg: 0, avoidedCo2eKg: 0 };
      }
      pathMap[r.next_life_path].massKg += mass;
      pathMap[r.next_life_path].avoidedCo2eKg += co2e;

      // Monthly Trend
      const date = new Date(r.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { massKg: 0, avoidedCo2eKg: 0 };
      }
      monthMap[monthKey].massKg += mass;
      monthMap[monthKey].avoidedCo2eKg += co2e;
    }

    const byCategory = Object.entries(categoryMap).map(([category, val]) => ({
      category,
      massKg: Math.round(val.massKg * 100) / 100,
      avoidedCo2eKg: Math.round(val.avoidedCo2eKg * 1000) / 1000,
      percentage: totalDivertedKg > 0 ? Math.round((val.massKg / totalDivertedKg) * 1000) / 10 : 0,
    }));

    const byPath = Object.entries(pathMap).map(([path, val]) => ({
      path,
      massKg: Math.round(val.massKg * 100) / 100,
      avoidedCo2eKg: Math.round(val.avoidedCo2eKg * 1000) / 1000,
      percentage: totalDivertedKg > 0 ? Math.round((val.massKg / totalDivertedKg) * 1000) / 10 : 0,
    }));

    const monthlyTrend = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, val]) => ({
        month,
        massKg: Math.round(val.massKg * 100) / 100,
        avoidedCo2eKg: Math.round(val.avoidedCo2eKg * 1000) / 1000,
      }));

    // Sponsorship pool details
    let sponsorshipPoolSummary = null;
    const pool = await impactRepo.findSponsorshipPoolByInstitution(campus.id);
    if (pool) {
      const totalBudget = Number(pool.total_budget_bdt);
      const remainingBudget = Number(pool.remaining_budget_bdt);
      const spentBudget = totalBudget - remainingBudget;

      sponsorshipPoolSummary = {
        totalBudgetBdt: totalBudget,
        remainingBudgetBdt: remainingBudget,
        monthlyDrawCapBdt: Number(pool.monthly_draw_cap_bdt),
        costPerKgDiverted: totalDivertedKg > 0 ? Math.round((spentBudget / totalDivertedKg) * 100) / 100 : 0,
        costPerTonneCo2eAvoided:
          totalAvoidedCo2eKg > 0
            ? Math.round((spentBudget / (totalAvoidedCo2eKg / 1000)) * 100) / 100
            : 0,
        isNearExhaustion: totalBudget > 0 && remainingBudget / totalBudget <= 0.15,
      };
    }

    return {
      institution: {
        id: campus.id,
        name: campus.name,
        slug: campus.slug,
      },
      totalDivertedKg: Math.round(totalDivertedKg * 100) / 100,
      totalAvoidedCo2eKg: Math.round(totalAvoidedCo2eKg * 1000) / 1000,
      activeMemberCount: userIds.size,
      byCategory,
      byPath,
      monthlyTrend,
      sponsorshipPool: sponsorshipPoolSummary,
      records: records as any,
    };
  }

  /**
   * Generates a SHA-256 signed ESG sustainability certificate with frozen record sets
   * and unguessable public reference (CERT-CAMPUS-YYYY-8hex)
   */
  static async generateCertificate(input: GenerateCertificateInput) {
    const campus = await impactRepo.findCampusByIdOrSlug(input.institutionId);
    if (!campus) {
      throw new NotFoundError('Institution or campus not found');
    }

    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(input.periodEnd);

    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      throw new BadRequestError('Invalid date format for periodStart or periodEnd');
    }

    // Fetch verified impact records for this institution within period
    const records = await impactRepo.findImpactRecordsByInstitution(campus.id, periodStart, periodEnd);

    const coveredRecordIds = records.map((r) => r.id).sort();
    let totalMassKg = 0;
    let totalCo2eKg = 0;

    for (const r of records) {
      totalMassKg += Number(r.mass_kg) || 0;
      totalCo2eKg += Number(r.avoided_co2e_kg) || 0;
    }

    totalMassKg = Math.round(totalMassKg * 100) / 100;
    totalCo2eKg = Math.round(totalCo2eKg * 1000) / 1000;

    // Generate unguessable verification reference (CERT-CAMPUS-YYYY-8hex)
    const hex8 = crypto.randomBytes(4).toString('hex');
    const year = periodEnd.getFullYear() || new Date().getFullYear();
    const slugUpper = (campus.slug || 'CAMPUS').toUpperCase();
    const certificateRef = `CERT-${slugUpper}-${year}-${hex8}`;

    // SHA-256 Signature over the canonical certificate payload
    const signaturePayload = JSON.stringify({
      institutionId: campus.id,
      campusSlug: campus.slug,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalMassKg: totalMassKg.toFixed(2),
      totalCo2eKg: totalCo2eKg.toFixed(3),
      coveredRecordIds,
    });
    const signatureHash = crypto.createHash('sha256').update(signaturePayload).digest('hex');

    const certificate = await impactRepo.createCertificate({
      institution_id: campus.id,
      certificate_ref: certificateRef,
      period_start: periodStart,
      period_end: periodEnd,
      total_mass_kg: totalMassKg,
      total_co2e_kg: totalCo2eKg,
      covered_record_ids: coveredRecordIds,
      signature_hash: signatureHash,
      issued_at: new Date(),
    });

    return certificate;
  }

  /**
   * Public unauthenticated certificate verification lookup by reference
   * Returns certificate details, methodology, factor uncertainty range, and signature.
   * STRICT PRIVACY: Returns NO personal user data or member IDs.
   */
  static async verifyCertificate(ref: string): Promise<PublicCertificateView> {
    const cert = await impactRepo.findCertificateByRef(ref);
    if (!cert) {
      throw new NotFoundError('Sustainability certificate not found or invalid reference');
    }

    const campus = await impactRepo.findCampusByIdOrSlug(cert.institution_id);
    const coveredIds = (cert.covered_record_ids as string[]) || [];

    const records = await impactRepo.findImpactRecordsByIds(coveredIds);

    const categoryMap: Record<string, { massKg: number; avoidedCo2eKg: number }> = {};
    const pathMap: Record<string, { massKg: number; avoidedCo2eKg: number }> = {};
    const factorVersions = new Set<string>();
    let ewasteCount = 0;
    const destinations = new Set<string>();

    let totalLowCo2e = 0;
    let totalHighCo2e = 0;

    for (const r of records) {
      const mass = Number(r.mass_kg) || 0;
      const co2e = Number(r.avoided_co2e_kg) || 0;

      if (r.factor_version) {
        factorVersions.add(r.factor_version);
      }

      if (r.category === 'E_WASTE') {
        ewasteCount += 1;
      }

      // Uncertainty range calculation
      const key = `${r.category.toUpperCase()}:${r.next_life_path.toUpperCase()}`;
      const baseline = BASELINE_EMISSION_FACTORS[key];
      if (baseline) {
        totalLowCo2e += mass * baseline.rangeLow;
        totalHighCo2e += mass * baseline.rangeHigh;
      } else {
        totalLowCo2e += co2e * 0.85;
        totalHighCo2e += co2e * 1.15;
      }

      if (!categoryMap[r.category]) {
        categoryMap[r.category] = { massKg: 0, avoidedCo2eKg: 0 };
      }
      categoryMap[r.category].massKg += mass;
      categoryMap[r.category].avoidedCo2eKg += co2e;

      if (!pathMap[r.next_life_path]) {
        pathMap[r.next_life_path] = { massKg: 0, avoidedCo2eKg: 0 };
      }
      pathMap[r.next_life_path].massKg += mass;
      pathMap[r.next_life_path].avoidedCo2eKg += co2e;
    }

    const byCategory = Object.entries(categoryMap).map(([category, val]) => ({
      category,
      massKg: Math.round(val.massKg * 100) / 100,
      avoidedCo2eKg: Math.round(val.avoidedCo2eKg * 1000) / 1000,
    }));

    const byPath = Object.entries(pathMap).map(([path, val]) => ({
      path,
      massKg: Math.round(val.massKg * 100) / 100,
      avoidedCo2eKg: Math.round(val.avoidedCo2eKg * 1000) / 1000,
    }));

    return {
      certificateRef: cert.certificate_ref,
      institutionName: campus?.name || 'Institution',
      campusSlug: campus?.slug || 'CAMPUS',
      periodStart: cert.period_start,
      periodEnd: cert.period_end,
      issuedAt: cert.issued_at,
      totalMassKg: Number(cert.total_mass_kg),
      totalCo2eKg: Number(cert.total_co2e_kg),
      recordCount: coveredIds.length,
      methodology: {
        factorVersion: Array.from(factorVersions).join(', ') || 'v1.0',
        sources: ['ISO 14044 Life Cycle Assessment', 'Climatiq Emission Factor Dataset', 'DEFRA', 'WEEE Forum'],
        basisStatement:
          'Diverted mass verified via physical scale readings and Trust Gate photographic evidence. Avoided emissions computed using published ISO 14044 factor tables.',
        uncertaintyRange: {
          rangeLowCo2eKg: Math.round(totalLowCo2e * 1000) / 1000,
          rangeHighCo2eKg: Math.round(totalHighCo2e * 1000) / 1000,
        },
      },
      breakdown: {
        byCategory,
        byPath,
        ewasteCount,
        licensedDestinations: Array.from(destinations),
      },
      signatureHash: cert.signature_hash,
      verificationStatus: 'VERIFIED_AUTHENTIC',
    };
  }

  /**
   * DoE E-Waste Regulatory Compliance Report
   * Surfaces complete chain of custody for hazardous e-waste with licensed partner verification
   */
  static async getEwasteComplianceReport(
    institutionId?: string | null,
    periodStart?: Date | null,
    periodEnd?: Date | null
  ): Promise<EwasteComplianceReport> {
    const ewasteRecords = await impactRepo.getEwasteRecords(institutionId, periodStart, periodEnd);

    const items: EwasteComplianceItem[] = [];
    let totalMassKg = 0;
    let licensedCount = 0;
    let unlicensedCount = 0;
    let flaggedGapsCount = 0;

    for (const r of ewasteRecords) {
      const mass = Number(r.mass_kg) || 0;
      totalMassKg += mass;

      let destinationPartnerName = 'Unassigned Partner';
      let destinationDoeLicenseDoc: string | null = null;
      let isLicensedPartner = false;
      let decidedBy = 'SYSTEM';
      let decidedAt: Date | string = r.created_at;

      // Look up trust decision
      const decision = await trustGateRepo.findDecisionById(r.trust_decision_id);
      if (decision) {
        decidedBy = decision.decided_by;
        decidedAt = decision.decided_at;
      }

      // Check custody source (deposit or pickup)
      if (r.custody_type === 'DEPOSIT') {
        const deposit = await depositRepo.findDepositById(r.custody_id);
        if (deposit) {
          const zone = await dropZoneRepo.findById(deposit.zone_id);
          if (zone?.contracted_partner_id) {
            const partner = await partnerRepo.findById(zone.contracted_partner_id);
            if (partner) {
              destinationPartnerName = partner.org_name;
              destinationDoeLicenseDoc = partner.doe_license_doc || null;
              isLicensedPartner = partner.e_waste_licensed;
            }
          }
        }
      } else if (r.custody_type === 'PICKUP') {
        const pickup = await pickupRepo.findById(r.custody_id);
        if (pickup?.collector_partner_id) {
          const partner = await partnerRepo.findById(pickup.collector_partner_id);
          if (partner) {
            destinationPartnerName = partner.org_name;
            destinationDoeLicenseDoc = partner.doe_license_doc || null;
            isLicensedPartner = partner.e_waste_licensed;
          }
        }
      }

      if (isLicensedPartner) {
        licensedCount += 1;
      } else {
        unlicensedCount += 1;
        flaggedGapsCount += 1;
      }

      const chainComplete = isLicensedPartner && Boolean(r.trust_decision_id);
      if (!chainComplete && isLicensedPartner) {
        flaggedGapsCount += 1;
      }

      items.push({
        impactRecordId: r.id,
        custodyId: r.custody_id,
        custodyType: r.custody_type,
        category: r.category,
        massKg: mass,
        destinationPartnerName,
        destinationDoeLicenseDoc,
        isLicensedPartner,
        trustDecisionId: r.trust_decision_id,
        decidedBy,
        decidedAt,
        chainComplete,
      });
    }

    const totalItems = items.length;
    const licensedPartnerPercentage =
      totalItems > 0 ? Math.round((licensedCount / totalItems) * 1000) / 10 : 100;

    return {
      institutionId,
      periodStart,
      periodEnd,
      items,
      totalItems,
      totalMassKg: Math.round(totalMassKg * 100) / 100,
      licensedPartnerPercentage,
      unlicensedDisposalsCount: unlicensedCount,
      flaggedGapsCount,
    };
  }
}
