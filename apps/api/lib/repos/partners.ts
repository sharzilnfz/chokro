// partners repo: persistence for service-provider partner records and their
// verification state (status + e-waste licence flag + reason + capability flags).
import { db, partners, eq, desc } from '@chokro/db';
import { withDb } from './seam';

export interface ApplyPartnerInput {
  user_id: string;
  org_name: string;
  types: string[];
  e_waste_licensed?: boolean;
  doe_license_doc?: string | null;
  status?: string;
  reason?: string | null;
  capability_flags?: Record<string, boolean>;
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
        .orderBy(desc(partners.created_at))
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
          reason: input.reason || null,
          capability_flags: input.capability_flags || {},
        })
        .onConflictDoUpdate({
          target: partners.user_id,
          set: {
            org_name: input.org_name,
            types: input.types,
            e_waste_licensed: input.e_waste_licensed ?? false,
            doe_license_doc: input.doe_license_doc || null,
            status: input.status || 'APPLIED',
            reason: input.reason || null,
            capability_flags: input.capability_flags || {},
          },
        })
        .returning();
      return partner;
    });
  },

  async reapply(id: string, input: ApplyPartnerInput) {
    return withDb(async () => {
      const [partner] = await db
        .update(partners)
        .set({
          org_name: input.org_name,
          types: input.types,
          e_waste_licensed: input.e_waste_licensed ?? false,
          doe_license_doc: input.doe_license_doc || null,
          status: 'APPLIED',
          reason: null, // Clear previous rejection reason
          capability_flags: input.capability_flags || {},
        })
        .where(eq(partners.id, id))
        .returning();
      return partner || null;
    });
  },

  async updateVerification(id: string, status: string, eWasteLicensed?: boolean, reason?: string | null) {
    return withDb(async () => {
      const license = eWasteLicensed ?? Boolean((await this.findById(id))?.doe_license_doc);
      const updateData: Record<string, unknown> = {
        status,
        e_waste_licensed: license,
      };
      if (reason !== undefined) {
        updateData.reason = reason;
      }
      const [updated] = await db
        .update(partners)
        .set(updateData)
        .where(eq(partners.id, id))
        .returning();
      return updated || null;
    });
  },

  async updateCapabilities(id: string, capabilityFlags: Record<string, boolean>) {
    return withDb(async () => {
      const [updated] = await db
        .update(partners)
        .set({ capability_flags: capabilityFlags })
        .where(eq(partners.id, id))
        .returning();
      return updated || null;
    });
  },
};