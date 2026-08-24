// trustGate repo: persistence for trust decisions, fraud flags, dynamic thresholds, and evidence hashes (SPEC 12 / Ticket 08a)
import {
  db,
  trustDecisions,
  fraudFlags,
  trustThresholdConfigs,
  evidenceHashes,
  eq,
  desc,
  and,
} from '@chokro/db';
import { withDb } from './seam';

export interface CreateDecisionInput {
  subject_type: string;
  subject_id: string;
  decision: 'AUTO_CLEAR' | 'ESCALATE' | string;
  failing_signals: string[];
  evaluated_signals: Record<string, any>;
  threshold_config_id?: string | null;
  decided_by?: string;
  notes?: string | null;
}

export interface CreateFraudFlagInput {
  entity_type: string;
  entity_id: string;
  flag_type: string;
  reason: string;
  severity?: string;
  is_cleared?: boolean;
}

export interface CreateEvidenceHashInput {
  evidence_url: string;
  phash_hex: string;
  uploader_id: string;
}

export const trustGateRepo = {
  // --- Trust Decisions ---
  async createDecision(input: CreateDecisionInput) {
    return withDb(async () => {
      const [record] = await db
        .insert(trustDecisions)
        .values({
          subject_type: input.subject_type,
          subject_id: input.subject_id,
          decision: input.decision,
          failing_signals: input.failing_signals,
          evaluated_signals: input.evaluated_signals,
          threshold_config_id: input.threshold_config_id || null,
          decided_by: input.decided_by || 'SYSTEM',
          notes: input.notes || null,
        })
        .returning();
      return record;
    });
  },

  async findDecisionById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(trustDecisions)
        .where(eq(trustDecisions.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async updateDecisionNotes(
    id: string,
    input: { notes: string; decided_by: string; decided_at: Date }
  ) {
    return withDb(async () => {
      const [updated] = await db
        .update(trustDecisions)
        .set({
          notes: input.notes,
          decided_by: input.decided_by,
          decided_at: input.decided_at,
        })
        .where(eq(trustDecisions.id, id))
        .returning();
      return updated || null;
    });
  },

  async findDecisionsBySubject(subjectType: string, subjectId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(trustDecisions)
        .where(
          and(
            eq(trustDecisions.subject_type, subjectType),
            eq(trustDecisions.subject_id, subjectId)
          )
        )
        .orderBy(desc(trustDecisions.created_at));
    });
  },

  async findLatestDecisions(limit = 50) {
    return withDb(async () => {
      return db
        .select()
        .from(trustDecisions)
        .orderBy(desc(trustDecisions.created_at))
        .limit(limit);
    });
  },

  // --- Fraud Flags ---
  async createFraudFlag(input: CreateFraudFlagInput) {
    return withDb(async () => {
      const [record] = await db
        .insert(fraudFlags)
        .values({
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          flag_type: input.flag_type,
          reason: input.reason,
          severity: input.severity || 'MEDIUM',
          is_cleared: input.is_cleared || false,
        })
        .returning();
      return record;
    });
  },

  async findActiveFraudFlags(entityType: string, entityId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(fraudFlags)
        .where(
          and(
            eq(fraudFlags.entity_type, entityType),
            eq(fraudFlags.entity_id, entityId),
            eq(fraudFlags.is_cleared, false)
          )
        )
        .orderBy(desc(fraudFlags.created_at));
    });
  },

  async countActiveFraudFlags(entityType: string, entityId: string): Promise<number> {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(fraudFlags)
        .where(
          and(
            eq(fraudFlags.entity_type, entityType),
            eq(fraudFlags.entity_id, entityId),
            eq(fraudFlags.is_cleared, false)
          )
        );
      return rows.length;
    });
  },

  async findFraudFlagsByEntity(entityType: string, entityId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(fraudFlags)
        .where(
          and(
            eq(fraudFlags.entity_type, entityType),
            eq(fraudFlags.entity_id, entityId)
          )
        )
        .orderBy(desc(fraudFlags.created_at));
    });
  },

  async clearFraudFlag(id: string, clearedBy: string) {
    return withDb(async () => {
      const [updated] = await db
        .update(fraudFlags)
        .set({
          is_cleared: true,
          cleared_by: clearedBy,
          cleared_at: new Date(),
        })
        .where(eq(fraudFlags.id, id))
        .returning();
      return updated || null;
    });
  },

  // --- Dynamic Threshold Configurations ---
  async getActiveThresholdConfig() {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(trustThresholdConfigs)
        .orderBy(desc(trustThresholdConfigs.effective_from), desc(trustThresholdConfigs.created_at))
        .limit(1);
      return rows[0] || null;
    });
  },

  async getThresholdConfigHistory(limit = 50) {
    return withDb(async () => {
      return db
        .select()
        .from(trustThresholdConfigs)
        .orderBy(desc(trustThresholdConfigs.effective_from), desc(trustThresholdConfigs.created_at))
        .limit(limit);
    });
  },

  async createThresholdConfig(configJson: Record<string, any>, updatedBy?: string | null) {
    return withDb(async () => {
      const [record] = await db
        .insert(trustThresholdConfigs)
        .values({
          config_json: configJson,
          effective_from: new Date(),
          updated_by: updatedBy || null,
        })
        .returning();
      return record;
    });
  },

  // --- Evidence Hashes ---
  async createEvidenceHash(input: CreateEvidenceHashInput) {
    return withDb(async () => {
      const [record] = await db
        .insert(evidenceHashes)
        .values({
          evidence_url: input.evidence_url,
          phash_hex: input.phash_hex,
          uploader_id: input.uploader_id,
        })
        .returning();
      return record;
    });
  },

  async findEvidenceHashes(limit = 100) {
    return withDb(async () => {
      return db
        .select()
        .from(evidenceHashes)
        .orderBy(desc(evidenceHashes.created_at))
        .limit(limit);
    });
  },

  async findEvidenceHashesByUploader(uploaderId: string, limit = 50) {
    return withDb(async () => {
      return db
        .select()
        .from(evidenceHashes)
        .where(eq(evidenceHashes.uploader_id, uploaderId))
        .orderBy(desc(evidenceHashes.created_at))
        .limit(limit);
    });
  },
};
