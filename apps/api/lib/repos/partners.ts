import { db, partners, users, memoryStore } from '@chokro/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { databaseOrTestStore } from '../database';

export interface CreatePartnerData {
  user_id?: string;
  userId?: string;
  org_name?: string;
  orgName?: string;
  types: string[];
  e_waste_licensed?: boolean;
  eWasteLicensed?: boolean;
  doe_license_doc?: string | null;
  doeLicenseDoc?: string | null;
  status?: string;
}

export const partnerRepo = {
  async findAll() {
    return databaseOrTestStore(
      () => db.select().from(partners),
      () => [...memoryStore.partners],
    );
  },

  async findByEmail(email: string) {
    return databaseOrTestStore(
      async () => {
        const rows = await db
          .select({ partner: partners })
          .from(partners)
          .innerJoin(users, eq(partners.user_id, users.id))
          .where(eq(users.email, email));
        return rows[0]?.partner || null;
      },
      () => {
        const found = memoryStore.partners.find((p: any) => {
          if (p.email === email) return true;
          const user = memoryStore.users.find((u: any) => u.id === p.user_id);
          return user?.email === email;
        });
        return found || null;
      },
    );
  },

  async findByOwnerId(ownerId: string) {
    return databaseOrTestStore(
      async () => {
        const rows = await db.select().from(partners).where(eq(partners.user_id, ownerId));
        return rows[0] || null;
      },
      () => {
        const found = memoryStore.partners.find((candidate: any) => candidate.user_id === ownerId);
        return found || null;
      },
    );
  },

  async findById(id: string) {
    return databaseOrTestStore(
      async () => {
        const rows = await db.select().from(partners).where(eq(partners.id, id));
        return rows[0] || null;
      },
      () => {
        const found = memoryStore.partners.find((candidate: any) => candidate.id === id);
        return found || null;
      },
    );
  },

  async create(data: CreatePartnerData) {
    const userId = data.user_id ?? data.userId;
    const orgName = data.org_name ?? data.orgName;
    const eWasteLicensed = data.e_waste_licensed ?? data.eWasteLicensed ?? false;
    const doeLicenseDoc = data.doe_license_doc ?? data.doeLicenseDoc ?? null;
    const status = data.status ?? 'APPLIED';

    const values = {
      user_id: userId!,
      org_name: orgName!,
      types: data.types,
      e_waste_licensed: eWasteLicensed,
      doe_license_doc: doeLicenseDoc,
      status,
    };

    return databaseOrTestStore(
      async () => (await db.insert(partners).values(values).returning())[0],
      () => {
        const application = {
          id: crypto.randomUUID(),
          ...values,
          created_at: new Date(),
        };
        memoryStore.partners.push(application);
        return application;
      },
    );
  },

  async updateStatusAndLicense(id: string, status: string, eWasteLicenseNumber?: string | null) {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    let doeLicenseDoc = existing.doe_license_doc;
    if (eWasteLicenseNumber !== undefined && eWasteLicenseNumber !== null) {
      doeLicenseDoc = eWasteLicenseNumber;
    }

    let eWasteLicensed = existing.e_waste_licensed;
    // SPEC 00 §2.5: the e_waste_licensed capability is granted only by an admin
    // at verification, and only when a DoE license document is on file.
    if (status === 'VERIFIED' && (doeLicenseDoc || existing.doe_license_doc) && !eWasteLicensed) {
      eWasteLicensed = true;
    }

    return databaseOrTestStore(
      async () =>
        (
          await db
            .update(partners)
            .set({
              status,
              e_waste_licensed: eWasteLicensed,
              doe_license_doc: doeLicenseDoc,
            })
            .where(eq(partners.id, id))
            .returning()
        )[0] || null,
      () => {
        existing.status = status;
        existing.e_waste_licensed = eWasteLicensed;
        existing.doe_license_doc = doeLicenseDoc;
        return existing;
      },
    );
  },
};
