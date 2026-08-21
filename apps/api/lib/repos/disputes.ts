// disputes repo: persistence for unified dispute arbitration across pickups, deposits, and auction lots (Ticket 09b / SPEC 13)
import { db, disputes, eq, desc, and } from '@chokro/db';
import { withDb } from './seam';

export type Dispute = typeof disputes.$inferSelect;

export interface CreateDisputeInput {
  source_type: string;
  source_id: string;
  opened_by: string;
  against_user_id: string;
  reason: string;
  evidence_urls?: string[];
  status?: string;
}

export interface ResolveDisputeInput {
  resolution: string;
  resolution_notes: string;
  resolved_by: string;
  resolved_at: Date;
  status?: string;
}

export const disputeRepo = {
  async create(input: CreateDisputeInput) {
    return withDb(async () => {
      const [dispute] = await db
        .insert(disputes)
        .values({
          source_type: input.source_type,
          source_id: input.source_id,
          opened_by: input.opened_by,
          against_user_id: input.against_user_id,
          reason: input.reason,
          evidence_urls: input.evidence_urls || [],
          status: input.status || 'OPEN',
        })
        .returning();
      return dispute;
    });
  },

  async findById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(disputes)
        .where(eq(disputes.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findBySource(sourceType: string, sourceId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(disputes)
        .where(and(eq(disputes.source_type, sourceType), eq(disputes.source_id, sourceId)))
        .orderBy(desc(disputes.created_at));
    });
  },

  async findOpenBySource(sourceType: string, sourceId: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(disputes)
        .where(
          and(
            eq(disputes.source_type, sourceType),
            eq(disputes.source_id, sourceId),
            eq(disputes.status, 'OPEN')
          )
        )
        .limit(1);
      return rows[0] || null;
    });
  },

  async countOpenDisputesForSource(sourceType: string, sourceId: string) {
    return withDb(async () => {
      const rows = await db
        .select({ id: disputes.id })
        .from(disputes)
        .where(
          and(
            eq(disputes.source_type, sourceType),
            eq(disputes.source_id, sourceId),
            eq(disputes.status, 'OPEN')
          )
        );
      return rows.length;
    });
  },

  async listDisputes(filters?: { status?: string; sourceType?: string }, limit = 100) {
    return withDb(async () => {
      const conditions = [];
      if (filters?.status) {
        conditions.push(eq(disputes.status, filters.status));
      }
      if (filters?.sourceType) {
        conditions.push(eq(disputes.source_type, filters.sourceType));
      }

      if (conditions.length > 0) {
        return db
          .select()
          .from(disputes)
          .where(and(...conditions))
          .orderBy(desc(disputes.created_at))
          .limit(limit);
      }

      return db
        .select()
        .from(disputes)
        .orderBy(desc(disputes.created_at))
        .limit(limit);
    });
  },

  async resolve(id: string, input: ResolveDisputeInput) {
    return withDb(async () => {
      const [updated] = await db
        .update(disputes)
        .set({
          status: input.status || 'RESOLVED',
          resolution: input.resolution,
          resolution_notes: input.resolution_notes,
          resolved_by: input.resolved_by,
          resolved_at: input.resolved_at,
        })
        .where(eq(disputes.id, id))
        .returning();
      return updated || null;
    });
  },

  // Merge new evidence URLs into the dispute's existing set (deduped) and persist.
  async addEvidence(id: string, evidenceUrls: string[]) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(disputes)
        .where(eq(disputes.id, id))
        .limit(1);
      const current = rows[0];
      if (!current) return null;

      const merged = Array.from(
        new Set([...(current.evidence_urls as string[]), ...evidenceUrls])
      );
      const [updated] = await db
        .update(disputes)
        .set({ evidence_urls: merged })
        .where(eq(disputes.id, id))
        .returning();
      return updated || null;
    });
  },
};
