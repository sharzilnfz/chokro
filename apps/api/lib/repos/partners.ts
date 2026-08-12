import { db, partners, eq, desc } from '@chokro/db';
import { withDb } from './seam';

export interface ApplyPartnerInput {
  userId?: string;
  user_id?: string;
  orgName?: string;
  org_name?: string;
  types: string[];
  eWasteLicensed?: boolean;
  e_waste_licensed?: boolean;
  doeLicenseDoc?: string | null;
  doe_license_doc?: string | null;
  status?: string;
}

export const partnerRepo = {
  async findById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(partners)
        .where(eq(partners.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findByUserId(userId: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(partners)
        .where(eq(partners.user_id, userId))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findAll() {
    return withDb(async () => {
      return db
        .select()
        .from(partners)
        .orderBy(desc(partners.created_at));
    });
  },

  async apply(input: ApplyPartnerInput) {
    return withDb(async () => {
      const userId = input.user_id || input.userId || '';
      const orgName = input.org_name || input.orgName || '';
      const eWasteLicensed = input.e_waste_licensed ?? input.eWasteLicensed ?? false;
      const doeLicenseDoc = input.doe_license_doc || input.doeLicenseDoc || null;
      const status = input.status || 'APPLIED';

      const [partner] = await db
        .insert(partners)
        .values({
          user_id: userId,
          org_name: orgName,
          types: input.types,
          e_waste_licensed: eWasteLicensed,
          doe_license_doc: doeLicenseDoc,
          status,
        })
        .returning();
      return partner;
    });
  },

  async create(input: ApplyPartnerInput) {
    return this.apply(input);
  },

  async updateVerification(id: string, status: string, eWasteLicensed?: boolean) {
    return withDb(async () => {
      let license = eWasteLicensed;
      if (license === undefined) {
        const existing = await this.findById(id);
        license = existing?.doe_license_doc ? true : false;
      }
      const [updated] = await db
        .update(partners)
        .set({
          status,
          e_waste_licensed: license,
        })
        .where(eq(partners.id, id))
        .returning();
      return updated || null;
    });
  },

  async updateStatusAndLicense(id: string, status: string, eWasteLicensed?: boolean) {
    return this.updateVerification(id, status, eWasteLicensed);
  },
};
