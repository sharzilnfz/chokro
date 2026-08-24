// handovers repo: persistence for custody handovers, decision contests, and escalation worklist queries (SPEC 12 / Ticket 08b)
import {
  db,
  custodyHandovers,
  decisionContests,
  trustDecisions,
  fraudFlags,
  depositRecords,
  pickupOrders,
  listings,
  partners,
  users,
  eq,
  desc,
  asc,
  and,
} from '@chokro/db';
import { withDb } from './seam';
import type { EscalationWorklistItem, HandoverStatus, DecisionContestStatus } from '@chokro/shared';

export interface CreateHandoverInput {
  task_id: string;
  otp_code_hash: string;
  giver_user_id: string;
  collector_partner_id: string;
  expires_at: Date;
  status?: HandoverStatus;
}

export interface CreateDecisionContestInput {
  decision_id: string;
  user_id: string;
  reason: string;
  status?: DecisionContestStatus;
}

export const handoverRepo = {
  // --- Custody Handovers ---
  async createHandover(input: CreateHandoverInput) {
    return withDb(async () => {
      const [record] = await db
        .insert(custodyHandovers)
        .values({
          task_id: input.task_id,
          otp_code_hash: input.otp_code_hash,
          giver_user_id: input.giver_user_id,
          collector_partner_id: input.collector_partner_id,
          status: input.status || 'PENDING',
          expires_at: input.expires_at,
        })
        .returning();
      return record;
    });
  },

  async findHandoverById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(custodyHandovers)
        .where(eq(custodyHandovers.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findLatestHandoverByTaskId(taskId: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(custodyHandovers)
        .where(eq(custodyHandovers.task_id, taskId))
        .orderBy(desc(custodyHandovers.created_at))
        .limit(1);
      return rows[0] || null;
    });
  },

  async updateHandoverStatus(id: string, status: HandoverStatus, confirmedAt?: Date) {
    return withDb(async () => {
      const updateData: Record<string, any> = { status };
      if (confirmedAt) {
        updateData.confirmed_at = confirmedAt;
      }
      const [updated] = await db
        .update(custodyHandovers)
        .set(updateData)
        .where(eq(custodyHandovers.id, id))
        .returning();
      return updated || null;
    });
  },

  // --- Decision Contests (Appeals) ---
  async createDecisionContest(input: CreateDecisionContestInput) {
    return withDb(async () => {
      const [record] = await db
        .insert(decisionContests)
        .values({
          decision_id: input.decision_id,
          user_id: input.user_id,
          reason: input.reason,
          status: input.status || 'PENDING',
        })
        .returning();
      return record;
    });
  },

  async findDecisionContestById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(decisionContests)
        .where(eq(decisionContests.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findContestsByDecisionId(decisionId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(decisionContests)
        .where(eq(decisionContests.decision_id, decisionId))
        .orderBy(desc(decisionContests.created_at));
    });
  },

  async findContestsByUserId(userId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(decisionContests)
        .where(eq(decisionContests.user_id, userId))
        .orderBy(desc(decisionContests.created_at));
    });
  },

  async updateDecisionContestStatus(
    id: string,
    status: DecisionContestStatus,
    reviewedBy: string,
    reviewedAt = new Date()
  ) {
    return withDb(async () => {
      const [updated] = await db
        .update(decisionContests)
        .set({
          status,
          reviewed_by: reviewedBy,
          reviewed_at: reviewedAt,
        })
        .where(eq(decisionContests.id, id))
        .returning();
      return updated || null;
    });
  },

  // --- Admin Escalation Worklist (A07) ---
  async getEscalations(limit = 100): Promise<EscalationWorklistItem[]> {
    return withDb(async () => {
      // 1. Fetch escalated decisions, ordered oldest first
      const decisions = await db
        .select()
        .from(trustDecisions)
        .where(eq(trustDecisions.decision, 'ESCALATE'))
        .orderBy(asc(trustDecisions.created_at))
        .limit(limit);

      const items: EscalationWorklistItem[] = [];

      for (const dec of decisions) {
        // Check for decision contests
        const contests = await db
          .select()
          .from(decisionContests)
          .where(eq(decisionContests.decision_id, dec.id))
          .orderBy(desc(decisionContests.created_at))
          .limit(1);
        const contest = contests[0] || null;

        let subjectData: EscalationWorklistItem['subject'] = null;
        let userId = dec.evaluated_signals?.user_id || null;
        let partnerId = dec.evaluated_signals?.partner_id || null;

        if (dec.subject_type === 'DEPOSIT') {
          const [deposit] = await db
            .select()
            .from(depositRecords)
            .where(eq(depositRecords.id, dec.subject_id))
            .limit(1);

          if (deposit) {
            userId = deposit.user_id;
            subjectData = {
              category: deposit.category,
              declared_quantity: deposit.declared_quantity,
              verified_quantity: deposit.verified_quantity ?? undefined,
              unit: deposit.unit,
              evidence_url: deposit.evidence_url,
              user_id: deposit.user_id,
              status: deposit.status,
            };
          }
        } else if (dec.subject_type === 'PICKUP') {
          const [pickup] = await db
            .select({
              order: pickupOrders,
              listing: listings,
            })
            .from(pickupOrders)
            .leftJoin(listings, eq(pickupOrders.listing_id, listings.id))
            .where(eq(pickupOrders.id, dec.subject_id))
            .limit(1);

          if (pickup) {
            userId = pickup.order.customer_id;
            partnerId = pickup.order.collector_partner_id;
            subjectData = {
              category: pickup.listing?.category,
              declared_quantity: pickup.listing?.declared_weight || pickup.listing?.piece_count || 1,
              unit: pickup.listing?.unit || 'kg',
              user_id: pickup.order.customer_id || undefined,
              partner_id: pickup.order.collector_partner_id || undefined,
              address: pickup.order.address,
              status: pickup.order.status,
            };
          }
        }

        // Fetch fraud flags for user and partner
        let userFlags: EscalationWorklistItem['user_flags'] = [];
        let partnerFlags: EscalationWorklistItem['partner_flags'] = [];

        if (userId) {
          const flags = await db
            .select()
            .from(fraudFlags)
            .where(and(eq(fraudFlags.entity_type, 'USER'), eq(fraudFlags.entity_id, userId)))
            .orderBy(desc(fraudFlags.created_at))
            .limit(10);
          userFlags = flags.map((f) => ({
            id: f.id,
            flag_type: f.flag_type,
            reason: f.reason,
            severity: f.severity,
            is_cleared: f.is_cleared,
            created_at: f.created_at,
          }));
        }

        if (partnerId) {
          const pFlags = await db
            .select()
            .from(fraudFlags)
            .where(and(eq(fraudFlags.entity_type, 'PARTNER'), eq(fraudFlags.entity_id, partnerId)))
            .orderBy(desc(fraudFlags.created_at))
            .limit(10);
          partnerFlags = pFlags.map((f) => ({
            id: f.id,
            flag_type: f.flag_type,
            reason: f.reason,
            severity: f.severity,
            is_cleared: f.is_cleared,
            created_at: f.created_at,
          }));
        }

        items.push({
          id: dec.id,
          subject_type: dec.subject_type,
          subject_id: dec.subject_id,
          decision: dec.decision,
          failing_signals: (dec.failing_signals as string[]) || [],
          evaluated_signals: (dec.evaluated_signals as Record<string, any>) || {},
          threshold_config_id: dec.threshold_config_id,
          decided_by: dec.decided_by,
          decided_at: dec.decided_at,
          notes: dec.notes,
          created_at: dec.created_at,
          is_contested: contest !== null && contest.status === 'PENDING',
          contest: contest
            ? {
                id: contest.id,
                reason: contest.reason,
                status: contest.status,
                user_id: contest.user_id,
                created_at: contest.created_at,
              }
            : null,
          subject: subjectData,
          user_flags: userFlags,
          partner_flags: partnerFlags,
        });
      }

      return items;
    });
  },
};
