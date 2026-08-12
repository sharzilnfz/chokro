import { partners, users, memoryStore } from '@chokro/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { withDb, createRepoSeam } from './seam';

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

export interface PartnerRepo {
  findAll(): Promise<Array<typeof partners.$inferSelect>>;
  findByEmail(email: string): Promise<typeof partners.$inferSelect | undefined | null>;
  findByOwnerId(ownerId: string): Promise<typeof partners.$inferSelect | undefined | null>;
  findById(id: string): Promise<typeof partners.$inferSelect | undefined | null>;
  create(data: CreatePartnerData): Promise<typeof partners.$inferSelect>;
  updateStatusAndLicense(id: string, status: string, eWasteLicenseNumber?: string | null): Promise<typeof partners.$inferSelect | undefined | null>;
}

export const drizzlePartnerRepo: PartnerRepo = {
  async findAll() {
    return withDb(async (db) => db.select().from(partners));
  },

  async findByEmail(email: string) {
    return withDb(async (db) => {
      const rows = await db
        .select({ partner: partners })
        .from(partners)
        .innerJoin(users, eq(partners.user_id, users.id))
        .where(eq(users.email, email));
      return rows[0]?.partner ?? null;
    });
  },

  async findByOwnerId(ownerId: string) {
    return withDb(async (db) => {
      const rows = await db.select().from(partners).where(eq(partners.user_id, ownerId));
      return rows[0] ?? null;
    });
  },

  async findById(id: string) {
    return withDb(async (db) => {
      const rows = await db.select().from(partners).where(eq(partners.id, id));
      return rows[0] ?? null;
    });
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

    return withDb(async (db) => {
      const rows = await db.insert(partners).values(values).returning();
      return rows[0];
    });
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
    if (status === 'VERIFIED' && (doeLicenseDoc || existing.doe_license_doc) && !eWasteLicensed) {
      eWasteLicensed = true;
    }

    return withDb(async (db) => {
      const rows = await db
        .update(partners)
        .set({
          status,
          e_waste_licensed: eWasteLicensed,
          doe_license_doc: doeLicenseDoc,
        })
        .where(eq(partners.id, id))
        .returning();
      return rows[0] ?? null;
    });
  },
};

export const memoryPartnerRepo: PartnerRepo = {
  async findAll() {
    return [...memoryStore.partners];
  },

  async findByEmail(email: string) {
    const found = memoryStore.partners.find((p: any) => {
      if (p.email === email) return true;
      const user = memoryStore.users.find((u: any) => u.id === p.user_id);
      return user?.email === email;
    });
    return found ?? null;
  },

  async findByOwnerId(ownerId: string) {
    const found = memoryStore.partners.find((candidate: any) => candidate.user_id === ownerId);
    return found ?? null;
  },

  async findById(id: string) {
    const found = memoryStore.partners.find((candidate: any) => candidate.id === id);
    return found ?? null;
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

    const application = {
      id: crypto.randomUUID(),
      ...values,
      created_at: new Date(),
    };
    memoryStore.partners.push(application);
    return application as any;
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
    if (status === 'VERIFIED' && (doeLicenseDoc || existing.doe_license_doc) && !eWasteLicensed) {
      eWasteLicensed = true;
    }

    existing.status = status;
    existing.e_waste_licensed = eWasteLicensed;
    existing.doe_license_doc = doeLicenseDoc;
    return existing;
  },
};

export const partnerRepo: PartnerRepo = createRepoSeam(drizzlePartnerRepo, memoryPartnerRepo);
