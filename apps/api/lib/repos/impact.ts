// impact repo: persistence for impact records, emission factors, institution accounts, sustainability certificates, and sponsorship pools (SPEC 14 / Ticket 10)
import {
  db,
  impactRecords,
  emissionFactors,
  institutionAccounts,
  sustainabilityCertificates,
  sponsorshipPools,
  campuses,
  users,
  partners,
  trustDecisions,
  depositRecords,
  pickupOrders,
  dropZones,
  eq,
  and,
  desc,
  asc,
  gte,
  lte,
  inArray,
  sql,
} from '@chokro/db';
import { withDb } from './seam';

export interface CreateImpactRecordInput {
  custody_type: string;
  custody_id: string;
  trust_decision_id: string;
  user_id: string;
  institution_id?: string | null;
  category: string;
  next_life_path: string;
  mass_kg: number | string;
  avoided_co2e_kg: number | string;
  factor_version: string;
  created_at?: Date;
}

export interface CreateEmissionFactorInput {
  category: string;
  next_life_path: string;
  factor_co2e_per_kg: number | string;
  range_low: number | string;
  range_high: number | string;
  source: string;
  version: string;
  effective_from?: Date;
}

export interface CreateInstitutionAccountInput {
  campus_id: string;
  invite_code: string;
  contact_email: string;
  total_diverted_kg?: number | string;
}

export interface CreateCertificateInput {
  institution_id: string;
  certificate_ref: string;
  period_start: Date;
  period_end: Date;
  total_mass_kg: number | string;
  total_co2e_kg: number | string;
  covered_record_ids: string[];
  signature_hash: string;
  issued_at?: Date;
}

export interface CreateSponsorshipPoolInput {
  institution_id: string;
  total_budget_bdt: number | string;
  remaining_budget_bdt: number | string;
  monthly_draw_cap_bdt: number | string;
}

export const impactRepo = {
  // --- 1. Impact Records ---
  async createImpactRecord(input: CreateImpactRecordInput) {
    return withDb(async () => {
      const [record] = await db
        .insert(impactRecords)
        .values({
          custody_type: input.custody_type,
          custody_id: input.custody_id,
          trust_decision_id: input.trust_decision_id,
          user_id: input.user_id,
          institution_id: input.institution_id || null,
          category: input.category,
          next_life_path: input.next_life_path,
          mass_kg: String(typeof input.mass_kg === 'number' ? input.mass_kg.toFixed(2) : input.mass_kg),
          avoided_co2e_kg: String(typeof input.avoided_co2e_kg === 'number' ? input.avoided_co2e_kg.toFixed(3) : input.avoided_co2e_kg),
          factor_version: input.factor_version,
          created_at: input.created_at || new Date(),
        })
        .returning();
      return record;
    });
  },

  async findImpactRecordByCustodyId(custodyId: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(impactRecords)
        .where(eq(impactRecords.custody_id, custodyId))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findImpactRecordsByUser(userId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(impactRecords)
        .where(eq(impactRecords.user_id, userId))
        .orderBy(desc(impactRecords.created_at));
    });
  },

  async findImpactRecordsByInstitution(
    institutionId: string,
    periodStart?: Date | null,
    periodEnd?: Date | null
  ) {
    return withDb(async () => {
      const conditions = [eq(impactRecords.institution_id, institutionId)];
      if (periodStart) {
        conditions.push(gte(impactRecords.created_at, periodStart));
      }
      if (periodEnd) {
        conditions.push(lte(impactRecords.created_at, periodEnd));
      }
      return db
        .select()
        .from(impactRecords)
        .where(and(...conditions))
        .orderBy(desc(impactRecords.created_at));
    });
  },

  async findImpactRecordsByIds(ids: string[]) {
    return withDb(async () => {
      if (!ids || ids.length === 0) return [];
      return db
        .select()
        .from(impactRecords)
        .where(inArray(impactRecords.id, ids))
        .orderBy(desc(impactRecords.created_at));
    });
  },

  // --- 2. Emission Factors ---
  async createEmissionFactor(input: CreateEmissionFactorInput) {
    return withDb(async () => {
      const [factor] = await db
        .insert(emissionFactors)
        .values({
          category: input.category,
          next_life_path: input.next_life_path,
          factor_co2e_per_kg: String(input.factor_co2e_per_kg),
          range_low: String(input.range_low),
          range_high: String(input.range_high),
          source: input.source,
          version: input.version,
          effective_from: input.effective_from || new Date(),
        })
        .returning();
      return factor;
    });
  },

  async findEffectiveEmissionFactor(
    category: string,
    nextLifePath: string,
    effectiveDate: Date = new Date()
  ) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(emissionFactors)
        .where(
          and(
            eq(emissionFactors.category, category),
            eq(emissionFactors.next_life_path, nextLifePath),
            lte(emissionFactors.effective_from, effectiveDate)
          )
        )
        .orderBy(desc(emissionFactors.effective_from), desc(emissionFactors.created_at))
        .limit(1);
      return rows[0] || null;
    });
  },

  async getAllEmissionFactors() {
    return withDb(async () => {
      return db
        .select()
        .from(emissionFactors)
        .orderBy(desc(emissionFactors.effective_from), desc(emissionFactors.created_at));
    });
  },

  // --- 3. Institution Accounts & Campuses ---
  async createInstitutionAccount(input: CreateInstitutionAccountInput) {
    return withDb(async () => {
      const [account] = await db
        .insert(institutionAccounts)
        .values({
          campus_id: input.campus_id,
          invite_code: input.invite_code,
          contact_email: input.contact_email,
          total_diverted_kg: String(input.total_diverted_kg || '0.00'),
        })
        .returning();
      return account;
    });
  },

  async findInstitutionAccountByCampusId(campusId: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(institutionAccounts)
        .where(eq(institutionAccounts.campus_id, campusId))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findInstitutionAccountByInviteCode(inviteCode: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(institutionAccounts)
        .where(eq(institutionAccounts.invite_code, inviteCode))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findCampusByIdOrSlug(idOrSlug: string) {
    return withDb(async () => {
      // Check uuid format or slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      if (isUuid) {
        const [byId] = await db
          .select()
          .from(campuses)
          .where(eq(campuses.id, idOrSlug))
          .limit(1);
        if (byId) return byId;
      }

      const [bySlug] = await db
        .select()
        .from(campuses)
        .where(eq(campuses.slug, idOrSlug))
        .limit(1);
      return bySlug || null;
    });
  },

  async updateInstitutionTotalDiverted(campusId: string, addMassKg: number) {
    return withDb(async () => {
      const account = await this.findInstitutionAccountByCampusId(campusId);
      if (!account) return null;
      const current = Number(account.total_diverted_kg) || 0;
      const newTotal = (current + addMassKg).toFixed(2);
      const [updated] = await db
        .update(institutionAccounts)
        .set({ total_diverted_kg: newTotal })
        .where(eq(institutionAccounts.id, account.id))
        .returning();
      return updated;
    });
  },

  // --- 4. Sustainability Certificates ---
  async createCertificate(input: CreateCertificateInput) {
    return withDb(async () => {
      const [cert] = await db
        .insert(sustainabilityCertificates)
        .values({
          institution_id: input.institution_id,
          certificate_ref: input.certificate_ref,
          period_start: input.period_start,
          period_end: input.period_end,
          total_mass_kg: String(typeof input.total_mass_kg === 'number' ? input.total_mass_kg.toFixed(2) : input.total_mass_kg),
          total_co2e_kg: String(typeof input.total_co2e_kg === 'number' ? input.total_co2e_kg.toFixed(3) : input.total_co2e_kg),
          covered_record_ids: input.covered_record_ids,
          signature_hash: input.signature_hash,
          issued_at: input.issued_at || new Date(),
        })
        .returning();
      return cert;
    });
  },

  async findCertificateByRef(ref: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(sustainabilityCertificates)
        .where(eq(sustainabilityCertificates.certificate_ref, ref))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findCertificateById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(sustainabilityCertificates)
        .where(eq(sustainabilityCertificates.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findCertificatesByInstitution(institutionId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(sustainabilityCertificates)
        .where(eq(sustainabilityCertificates.institution_id, institutionId))
        .orderBy(desc(sustainabilityCertificates.issued_at));
    });
  },

  async findAllCertificates() {
    return withDb(async () => {
      return db
        .select({
          id: sustainabilityCertificates.id,
          institution_id: sustainabilityCertificates.institution_id,
          certificate_ref: sustainabilityCertificates.certificate_ref,
          period_start: sustainabilityCertificates.period_start,
          period_end: sustainabilityCertificates.period_end,
          total_mass_kg: sustainabilityCertificates.total_mass_kg,
          total_co2e_kg: sustainabilityCertificates.total_co2e_kg,
          covered_record_ids: sustainabilityCertificates.covered_record_ids,
          signature_hash: sustainabilityCertificates.signature_hash,
          issued_at: sustainabilityCertificates.issued_at,
          institution_name: campuses.name,
          institution_slug: campuses.slug,
        })
        .from(sustainabilityCertificates)
        .leftJoin(campuses, eq(sustainabilityCertificates.institution_id, campuses.id))
        .orderBy(desc(sustainabilityCertificates.issued_at));
    });
  },

  // --- 5. Sponsorship Pools ---
  async createSponsorshipPool(input: CreateSponsorshipPoolInput) {
    return withDb(async () => {
      const [pool] = await db
        .insert(sponsorshipPools)
        .values({
          institution_id: input.institution_id,
          total_budget_bdt: String(typeof input.total_budget_bdt === 'number' ? input.total_budget_bdt.toFixed(2) : input.total_budget_bdt),
          remaining_budget_bdt: String(typeof input.remaining_budget_bdt === 'number' ? input.remaining_budget_bdt.toFixed(2) : input.remaining_budget_bdt),
          monthly_draw_cap_bdt: String(typeof input.monthly_draw_cap_bdt === 'number' ? input.monthly_draw_cap_bdt.toFixed(2) : input.monthly_draw_cap_bdt),
        })
        .returning();
      return pool;
    });
  },

  async findSponsorshipPoolByInstitution(institutionId: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(sponsorshipPools)
        .where(eq(sponsorshipPools.institution_id, institutionId))
        .orderBy(desc(sponsorshipPools.created_at))
        .limit(1);
      return rows[0] || null;
    });
  },

  async updateSponsorshipPoolRemaining(id: string, newRemainingBdt: number | string) {
    return withDb(async () => {
      const [updated] = await db
        .update(sponsorshipPools)
        .set({
          remaining_budget_bdt: String(typeof newRemainingBdt === 'number' ? newRemainingBdt.toFixed(2) : newRemainingBdt),
        })
        .where(eq(sponsorshipPools.id, id))
        .returning();
      return updated || null;
    });
  },

  // --- 6. E-Waste Compliance Queries ---
  async getEwasteRecords(institutionId?: string | null, periodStart?: Date | null, periodEnd?: Date | null) {
    return withDb(async () => {
      const conditions = [eq(impactRecords.category, 'E_WASTE')];
      if (institutionId) {
        conditions.push(eq(impactRecords.institution_id, institutionId));
      }
      if (periodStart) {
        conditions.push(gte(impactRecords.created_at, periodStart));
      }
      if (periodEnd) {
        conditions.push(lte(impactRecords.created_at, periodEnd));
      }

      return db
        .select()
        .from(impactRecords)
        .where(and(...conditions))
        .orderBy(desc(impactRecords.created_at));
    });
  },
};
