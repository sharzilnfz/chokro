import { db, partners, eq, desc } from '@chokro/db';
import { withDb } from './seam';

export interface ApplyPartnerInput {
  user_id: string;
  org_name: string;
  types: string[];
  e_waste_licensed?: boolean;
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
      const [partner] = await db
        .insert(partners)
        .values({
          user_id: input.user_id,
          org_name: input.org_name,
          types: input.types,
          e_waste_licensed: input.e_waste_licensed ?? false,
          doe_license_doc: input.doe_license_doc || null,
          status: input.status || 'APPLIED',
        })
        .returning();
      return partner;
    });
  },

  async updateVerification(id: string, status: string, eWasteLicensed?: boolean) {
    return withDb(async () => {
      const existing = await this.findById(id);
      const license = eWasteLicensed ?? Boolean(existing?.doe_license_doc);
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
};