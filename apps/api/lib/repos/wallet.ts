// wallet repo: persistence for wallet credit transactions (kind/status/amount/reason).
import { db, creditTxns, eq, desc, and } from '@chokro/db';
import { withDb } from './seam';

export interface CreateAdjustmentTransactionInput {
  userId: string;
  amount: number;
  reason?: string | null;
}

export interface CreateEarnTransactionInput {
  userId: string;
  amount: number | string;
  custodyRef?: string | null;
  rateCardEntryId?: string | null;
  reason?: string | null;
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export const walletRepo = {
  // A user's full credit history, newest first.
  async findTransactionsByOwner(userId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(creditTxns)
        .where(eq(creditTxns.user_id, userId))
        .orderBy(desc(creditTxns.created_at));
    });
  },

  // Record an admin adjustment as an immediately-VERIFIED ADJUST entry
  async createAdjustmentTransaction(input: CreateAdjustmentTransactionInput) {
    return withDb(async () => {
      const [txn] = await db
        .insert(creditTxns)
        .values({
          user_id: input.userId,
          amount: String(input.amount.toFixed(2)),
          kind: 'ADJUST',
          status: 'VERIFIED',
          reason: input.reason || null,
        })
        .returning();
      return txn;
    });
  },

  // Record an EARN credit transaction bound to a custody event
  async createEarnTransaction(input: CreateEarnTransactionInput) {
    return withDb(async () => {
      const [txn] = await db
        .insert(creditTxns)
        .values({
          user_id: input.userId,
          amount: String(typeof input.amount === 'number' ? input.amount.toFixed(2) : input.amount),
          kind: 'EARN',
          status: input.status || 'PENDING',
          custody_ref: input.custodyRef || null,
          rate_card_entry_id: input.rateCardEntryId || null,
          reason: input.reason || null,
        })
        .returning();
      return txn;
    });
  },

  // Update pending credit amount upon verified scale reading
  async updatePendingCreditAmount(custodyRef: string, newAmount: number | string) {
    return withDb(async () => {
      const [updated] = await db
        .update(creditTxns)
        .set({
          amount: String(typeof newAmount === 'number' ? newAmount.toFixed(2) : newAmount),
        })
        .where(
          and(
            eq(creditTxns.custody_ref, custodyRef),
            eq(creditTxns.status, 'PENDING')
          )
        )
        .returning();
      return updated || null;
    });
  },

  // Lookup credit by custody ref
  async findByCustodyRef(custodyRef: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(creditTxns)
        .where(eq(creditTxns.custody_ref, custodyRef))
        .limit(1);
      return rows[0] || null;
    });
  },

  // Lookup credit by ID
  async findById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(creditTxns)
        .where(eq(creditTxns.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  // Flips PENDING credit to VERIFIED, sets trust_decision_id, and optionally updates amount
  async verifyCreditTransaction(input: {
    id?: string;
    custodyRef?: string;
    trustDecisionId: string;
    amount?: number | string;
  }) {
    return withDb(async () => {
      const conditions = [eq(creditTxns.status, 'PENDING')];
      if (input.id) {
        conditions.push(eq(creditTxns.id, input.id));
      } else if (input.custodyRef) {
        conditions.push(eq(creditTxns.custody_ref, input.custodyRef));
      } else {
        return null;
      }

      const updateData: Record<string, any> = {
        status: 'VERIFIED',
        trust_decision_id: input.trustDecisionId,
      };
      if (input.amount !== undefined && input.amount !== null) {
        updateData.amount = String(
          typeof input.amount === 'number' ? input.amount.toFixed(2) : input.amount
        );
      }

      const [updated] = await db
        .update(creditTxns)
        .set(updateData)
        .where(and(...conditions))
        .returning();
      return updated || null;
    });
  },
};
