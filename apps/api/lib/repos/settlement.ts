// Settlement repository: persistence for liability caps, redemption requests, and MFS payout records (SPEC 13 / Ticket 09a)
import {
  db,
  liabilityCaps,
  redemptionRequests,
  payoutRecords,
  creditTxns,
  users,
  trustDecisions,
  eq,
  desc,
  and,
  gte,
  lte,
  inArray,
  sql,
} from '@chokro/db';
import { withDb } from './seam';
import { ConflictError, BadRequestError } from '../database';
import { LedgerMath } from '../LedgerMath';
import { DEFAULT_LIABILITY_CAPS, type RedemptionStatus, type PayoutStatus } from '@chokro/shared';
import crypto from 'crypto';

export interface CreateLiabilityCapInput {
  monthlyPlatformCapBdt: number;
  monthlyUserCapBdt: number;
  minRedemptionBdt: number;
  feePercentage: number;
  updatedBy?: string | null;
}

export interface CreateRedemptionRequestInput {
  id?: string;
  userId: string;
  amountCredits: number;
  payoutChannel: string;
  accountNumber: string;
  grossAmountBdt: number;
  feeBdt: number;
  netAmountBdt: number;
  status?: RedemptionStatus;
  trustDecisionId?: string | null;
}

export interface CreatePayoutRecordInput {
  redemptionId: string;
  gatewayRef?: string | null;
  gatewayProvider?: string;
  status: PayoutStatus;
  payload?: Record<string, any> | null;
}

export const settlementRepo = {
  // 1. Get active liability caps (latest row or defaults)
  async getActiveLiabilityCaps(dbOrTx: any = db) {
    return withDb(async () => {
      const rows = await dbOrTx
        .select()
        .from(liabilityCaps)
        .orderBy(desc(liabilityCaps.created_at))
        .limit(1);

      if (rows.length > 0) {
        return {
          id: rows[0].id,
          monthly_platform_cap_bdt: Number(rows[0].monthly_platform_cap_bdt),
          monthly_user_cap_bdt: Number(rows[0].monthly_user_cap_bdt),
          min_redemption_bdt: Number(rows[0].min_redemption_bdt),
          fee_percentage: Number(rows[0].fee_percentage),
          effective_from: rows[0].effective_from,
          updated_by: rows[0].updated_by,
          created_at: rows[0].created_at,
        };
      }

      return {
        ...DEFAULT_LIABILITY_CAPS,
        id: undefined,
        effective_from: new Date(),
        updated_by: null,
        created_at: new Date(),
      };
    });
  },

  // 2. Create new liability cap (supersedes active cap)
  async createLiabilityCap(
    input: CreateLiabilityCapInput,
    updatedBy?: string | null,
    dbOrTx: any = db
  ) {
    const actorId = updatedBy !== undefined ? updatedBy : input.updatedBy;
    return withDb(async (dbInstance) => {
      const targetDb = dbOrTx && typeof dbOrTx.insert === 'function' ? dbOrTx : dbInstance;
      const [record] = await targetDb
        .insert(liabilityCaps)
        .values({
          monthly_platform_cap_bdt: String(input.monthlyPlatformCapBdt.toFixed(2)),
          monthly_user_cap_bdt: String(input.monthlyUserCapBdt.toFixed(2)),
          min_redemption_bdt: String(input.minRedemptionBdt.toFixed(2)),
          fee_percentage: String(input.feePercentage.toFixed(2)),
          updated_by: actorId || null,
        })
        .returning();

      return {
        id: record.id,
        monthly_platform_cap_bdt: Number(record.monthly_platform_cap_bdt),
        monthly_user_cap_bdt: Number(record.monthly_user_cap_bdt),
        min_redemption_bdt: Number(record.min_redemption_bdt),
        fee_percentage: Number(record.fee_percentage),
        effective_from: record.effective_from,
        updated_by: record.updated_by,
        created_at: record.created_at,
      };
    });
  },

  // 3. Get liability caps audit history
  async getLiabilityCapHistory(limit = 50, dbOrTx: any = db) {
    return withDb(async () => {
      return dbOrTx
        .select()
        .from(liabilityCaps)
        .orderBy(desc(liabilityCaps.created_at))
        .limit(limit);
    });
  },

  // 4. Create redemption request
  async createRedemptionRequest(input: CreateRedemptionRequestInput, dbOrTx: any = db) {
    return withDb(async () => {
      const [record] = await dbOrTx
        .insert(redemptionRequests)
        .values({
          id: input.id || crypto.randomUUID(),
          user_id: input.userId,
          amount_credits: String(input.amountCredits.toFixed(2)),
          payout_channel: input.payoutChannel,
          account_number: input.accountNumber,
          gross_amount_bdt: String(input.grossAmountBdt.toFixed(2)),
          fee_bdt: String(input.feeBdt.toFixed(2)),
          net_amount_bdt: String(input.netAmountBdt.toFixed(2)),
          status: input.status || 'REQUESTED',
          trust_decision_id: input.trustDecisionId || null,
        })
        .returning();

      return record;
    });
  },

  // 5. Find redemption by ID
  async findRedemptionById(id: string, dbOrTx: any = db) {
    return withDb(async () => {
      const rows = await dbOrTx
        .select()
        .from(redemptionRequests)
        .where(eq(redemptionRequests.id, id))
        .limit(1);

      return rows[0] || null;
    });
  },

  // 6. Find redemptions by user
  async findRedemptionsByUser(userId: string, limit = 50, dbOrTx: any = db) {
    return withDb(async () => {
      return dbOrTx
        .select()
        .from(redemptionRequests)
        .where(eq(redemptionRequests.user_id, userId))
        .orderBy(desc(redemptionRequests.created_at))
        .limit(limit);
    });
  },

  // 7. Find all redemptions with joins for Admin console (A10)
  async findAllRedemptions(
    filters?: { status?: string; limit?: number; offset?: number },
    dbOrTx: any = db
  ) {
    return withDb(async () => {
      const limit = filters?.limit ?? 50;
      const offset = filters?.offset ?? 0;

      let query = dbOrTx
        .select({
          redemption: redemptionRequests,
          user: {
            id: users.id,
            email: users.email,
            full_name: users.full_name,
            phone: users.phone,
          },
          trust_decision: {
            id: trustDecisions.id,
            decision: trustDecisions.decision,
            failing_signals: trustDecisions.failing_signals,
            evaluated_signals: trustDecisions.evaluated_signals,
            notes: trustDecisions.notes,
          },
        })
        .from(redemptionRequests)
        .leftJoin(users, eq(redemptionRequests.user_id, users.id))
        .leftJoin(trustDecisions, eq(redemptionRequests.trust_decision_id, trustDecisions.id))
        .orderBy(desc(redemptionRequests.created_at))
        .limit(limit)
        .offset(offset);

      if (filters?.status && filters.status !== 'ALL') {
        query = query.where(eq(redemptionRequests.status, filters.status as any));
      }

      const rows = await query;

      // Fetch latest payouts for these redemptions
      const redemptionIds = rows.map((r: any) => r.redemption.id);
      let payoutsMap: Record<string, any> = {};

      if (redemptionIds.length > 0) {
        const payouts = await dbOrTx
          .select()
          .from(payoutRecords)
          .where(inArray(payoutRecords.redemption_id, redemptionIds))
          .orderBy(desc(payoutRecords.created_at));

        for (const p of payouts) {
          if (!payoutsMap[p.redemption_id]) {
            payoutsMap[p.redemption_id] = p;
          }
        }
      }

      return rows.map((r: any) => ({
        ...r.redemption,
        user: r.user,
        trust_decision: r.trust_decision,
        payout: payoutsMap[r.redemption.id] || null,
      }));
    });
  },

  // 8. Update redemption status and optional trust decision id
  async updateRedemptionStatus(
    id: string,
    status: RedemptionStatus,
    trustDecisionId?: string | null,
    dbOrTx: any = db
  ) {
    return withDb(async () => {
      const updateData: Record<string, any> = { status };
      if (trustDecisionId !== undefined) {
        updateData.trust_decision_id = trustDecisionId;
      }

      const [updated] = await dbOrTx
        .update(redemptionRequests)
        .set(updateData)
        .where(eq(redemptionRequests.id, id))
        .returning();

      return updated || null;
    });
  },

  // 9. Create payout record
  async createPayoutRecord(input: CreatePayoutRecordInput, dbOrTx: any = db) {
    return withDb(async () => {
      const [record] = await dbOrTx
        .insert(payoutRecords)
        .values({
          redemption_id: input.redemptionId,
          gateway_ref: input.gatewayRef || null,
          gateway_provider: input.gatewayProvider || 'SSLCOMMERZ_MFS',
          status: input.status,
          payload: input.payload || null,
        })
        .returning();

      return record;
    });
  },

  // 10. Find payouts for a redemption
  async findPayoutsByRedemptionId(redemptionId: string, dbOrTx: any = db) {
    return withDb(async () => {
      return dbOrTx
        .select()
        .from(payoutRecords)
        .where(eq(payoutRecords.redemption_id, redemptionId))
        .orderBy(desc(payoutRecords.created_at));
    });
  },

  // 11/12. Sum gross redeemed BDT in calendar month — across all users or one user (the twins, parameterized).
  async getMonthlyRedeemedBdt(userId: string | null, date: Date = new Date(), dbOrTx: any = db) {
    return withDb(async () => {
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

      const filters = [
        gte(redemptionRequests.created_at, startOfMonth),
        lte(redemptionRequests.created_at, endOfMonth),
        inArray(redemptionRequests.status, ['REQUESTED', 'AUTO_APPROVED', 'ESCALATED', 'APPROVED', 'PAID']),
      ];
      if (userId !== null) filters.push(eq(redemptionRequests.user_id, userId));

      const [row] = await dbOrTx
        .select({ total: sql<string>`COALESCE(SUM(${redemptionRequests.gross_amount_bdt}), 0)` })
        .from(redemptionRequests)
        .where(and(...filters));

      const total = Number(row?.total);
      return Number.isFinite(total) ? Number(total.toFixed(2)) : 0;
    });
  },

  // 11. Sum user's gross redeemed BDT in calendar month
  async getUserMonthlyRedeemedBdt(userId: string, date: Date = new Date(), dbOrTx: any = db) {
    return this.getMonthlyRedeemedBdt(userId, date, dbOrTx);
  },

  // 12. Sum platform's gross redeemed BDT in calendar month
  async getPlatformMonthlyRedeemedBdt(date: Date = new Date(), dbOrTx: any = db) {
    return this.getMonthlyRedeemedBdt(null, date, dbOrTx);
  },

  // 13. Derive platform outstanding liability from append-only credit ledger.
  // Aggregation is pushed into SQL (GROUP BY kind, status) — the whole ledger is never loaded.
  async getPlatformLiabilityMetrics(dbOrTx: any = db) {
    return withDb(async () => {
      const grouped = await dbOrTx
        .select({
          kind: creditTxns.kind,
          status: creditTxns.status,
          amount: sql<string>`COALESCE(SUM(${creditTxns.amount}), 0)`,
        })
        .from(creditTxns)
        .groupBy(creditTxns.kind, creditTxns.status);

      return LedgerMath.sumPlatform(grouped);
    });
  },

  // 14. Atomic redemption creation with concurrency protection
  async atomicCreateRedemption(params: {
    userId: string;
    amountCredits: number;
    payoutChannel: string;
    accountNumber: string;
    grossAmountBdt: number;
    feeBdt: number;
    netAmountBdt: number;
    minRedemptionBdt: number;
    monthlyUserCapBdt: number;
    monthlyPlatformCapBdt: number;
  }) {
    return withDb(async () => {
      return db.transaction(async (tx) => {
        // 1. Re-evaluate monthly user cap inside transaction
        const userMonthly = await this.getUserMonthlyRedeemedBdt(params.userId, new Date(), tx);
        if (userMonthly + params.amountCredits > params.monthlyUserCapBdt) {
          const remaining = Math.max(0, params.monthlyUserCapBdt - userMonthly);
          throw new BadRequestError(
            `Redemption exceeds monthly user allowance of ৳${params.monthlyUserCapBdt.toFixed(2)}. Remaining allowance: ৳${remaining.toFixed(2)}`
          );
        }

        // 2. Re-evaluate monthly platform liability cap inside transaction
        const platformMonthly = await this.getPlatformMonthlyRedeemedBdt(new Date(), tx);
        if (platformMonthly + params.amountCredits > params.monthlyPlatformCapBdt) {
          throw new BadRequestError('Platform monthly liability cap reached. Cash-out temporarily paused.');
        }

        // 3. Re-derive verified balance inside serialized transaction
        const userTxns = await tx
          .select()
          .from(creditTxns)
          .where(eq(creditTxns.user_id, params.userId));

        const balance = LedgerMath.sumUser(userTxns);

        if (balance.verified < params.amountCredits) {
          throw new ConflictError(
            `Insufficient verified balance: ৳${balance.verified.toFixed(2)} available, ৳${params.amountCredits.toFixed(2)} requested`
          );
        }

        const redemptionId = crypto.randomUUID();
        const custodyRef = `REDEMPTION-${redemptionId}`;

        // 4. Insert pending REDEEM ledger entry (holds credits by derived balance deduction)
        const [creditTxn] = await tx
          .insert(creditTxns)
          .values({
            user_id: params.userId,
            amount: String(params.amountCredits.toFixed(2)),
            kind: 'REDEEM',
            status: 'PENDING',
            source_id: redemptionId,
            custody_ref: custodyRef,
            reason: `Cash-out redemption via ${params.payoutChannel} to ${params.accountNumber}`,
          })
          .returning();

        // 5. Insert redemption request record
        const [redemption] = await tx
          .insert(redemptionRequests)
          .values({
            id: redemptionId,
            user_id: params.userId,
            amount_credits: String(params.amountCredits.toFixed(2)),
            payout_channel: params.payoutChannel,
            account_number: params.accountNumber,
            gross_amount_bdt: String(params.grossAmountBdt.toFixed(2)),
            fee_bdt: String(params.feeBdt.toFixed(2)),
            net_amount_bdt: String(params.netAmountBdt.toFixed(2)),
            status: 'REQUESTED',
          })
          .returning();

        return { redemption, creditTxn };
      });
    });
  },
};
