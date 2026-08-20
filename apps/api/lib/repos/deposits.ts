// deposits repo: persistence for drop-zone sessions, deposits, and emptying records (SPEC 11)
import { db, dropSessions, depositRecords, zoneEmptyingRecords, dropZones, users, eq, desc, and, gt, gte } from '@chokro/db';
import { withDb } from './seam';

export interface CreateSessionInput {
  zone_id: string;
  user_id: string;
  session_secret: string;
  short_code: string;
  expires_at: Date;
}

export interface CreateDepositInput {
  session_id: string;
  zone_id: string;
  user_id: string;
  category: string;
  unit: string;
  declared_quantity: number | string;
  evidence_url: string;
  rate_card_entry_id?: string | null;
  estimated_bdt: number | string;
  status?: string;
}

export interface CreateEmptyingInput {
  zone_id: string;
  collector_partner_id?: string | null;
  scale_readings_json: Record<string, number>;
  evidence_url?: string | null;
  total_mass_kg: number | string;
  emptied_at?: Date;
}

export const depositRepo = {
  // Create a new deposit session
  async createSession(input: CreateSessionInput) {
    return withDb(async () => {
      const [session] = await db
        .insert(dropSessions)
        .values({
          zone_id: input.zone_id,
          user_id: input.user_id,
          session_secret: input.session_secret,
          short_code: input.short_code,
          status: 'OPEN',
          expires_at: input.expires_at,
        })
        .returning();
      return session;
    });
  },

  // Find active non-expired session for a user and zone
  async findActiveSession(userId: string, zoneId: string) {
    return withDb(async () => {
      const now = new Date();
      const rows = await db
        .select()
        .from(dropSessions)
        .where(
          and(
            eq(dropSessions.user_id, userId),
            eq(dropSessions.zone_id, zoneId),
            eq(dropSessions.status, 'OPEN'),
            gt(dropSessions.expires_at, now)
          )
        )
        .orderBy(desc(dropSessions.created_at))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findSessionById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(dropSessions)
        .where(eq(dropSessions.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  // Atomic single-use consumption lock
  async consumeSession(id: string) {
    return withDb(async () => {
      const now = new Date();
      const [consumed] = await db
        .update(dropSessions)
        .set({ status: 'CONSUMED' })
        .where(
          and(
            eq(dropSessions.id, id),
            eq(dropSessions.status, 'OPEN'),
            gt(dropSessions.expires_at, now)
          )
        )
        .returning();
      return consumed || null;
    });
  },

  // Insert a deposit record
  async createDeposit(input: CreateDepositInput) {
    return withDb(async () => {
      const [deposit] = await db
        .insert(depositRecords)
        .values({
          session_id: input.session_id,
          zone_id: input.zone_id,
          user_id: input.user_id,
          category: input.category,
          unit: input.unit,
          declared_quantity: String(input.declared_quantity),
          evidence_url: input.evidence_url,
          rate_card_entry_id: input.rate_card_entry_id || null,
          estimated_bdt: String(typeof input.estimated_bdt === 'number' ? input.estimated_bdt.toFixed(2) : input.estimated_bdt),
          status: input.status || 'RECORDED',
        })
        .returning();
      return deposit;
    });
  },

  async findDepositById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(depositRecords)
        .where(eq(depositRecords.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  // Find recorded deposits for a zone since last emptying
  async findRecordedDepositsByZone(zoneId: string, sinceTimestamp?: Date | null) {
    return withDb(async () => {
      const conditions = [
        eq(depositRecords.zone_id, zoneId),
        eq(depositRecords.status, 'RECORDED'),
      ];
      if (sinceTimestamp) {
        conditions.push(gte(depositRecords.created_at, sinceTimestamp));
      }
      return db
        .select()
        .from(depositRecords)
        .where(and(...conditions))
        .orderBy(depositRecords.created_at);
    });
  },

  // Update verified quantity and divergence ratio upon scale emptying
  async updateDepositVerification(
    id: string,
    verifiedQuantity: number | string,
    verifiedBdt: number | string,
    divergenceRatio: number | string,
    status = 'RECORDED'
  ) {
    return withDb(async () => {
      const [updated] = await db
        .update(depositRecords)
        .set({
          verified_quantity: String(typeof verifiedQuantity === 'number' ? verifiedQuantity.toFixed(2) : verifiedQuantity),
          verified_bdt: String(typeof verifiedBdt === 'number' ? verifiedBdt.toFixed(2) : verifiedBdt),
          divergence_ratio: String(typeof divergenceRatio === 'number' ? divergenceRatio.toFixed(3) : divergenceRatio),
          status,
        })
        .where(eq(depositRecords.id, id))
        .returning();
      return updated || null;
    });
  },

  // Emptying history
  async createEmptyingRecord(input: CreateEmptyingInput) {
    return withDb(async () => {
      const [record] = await db
        .insert(zoneEmptyingRecords)
        .values({
          zone_id: input.zone_id,
          collector_partner_id: input.collector_partner_id || null,
          scale_readings_json: input.scale_readings_json,
          evidence_url: input.evidence_url || null,
          total_mass_kg: String(input.total_mass_kg),
          emptied_at: input.emptied_at || new Date(),
        })
        .returning();
      return record;
    });
  },

  async findEmptyingRecordsByZone(zoneId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(zoneEmptyingRecords)
        .where(eq(zoneEmptyingRecords.zone_id, zoneId))
        .orderBy(desc(zoneEmptyingRecords.emptied_at));
    });
  },
};
