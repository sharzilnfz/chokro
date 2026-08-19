// wallet repo: persistence for wallet credit transactions (kind/status/amount/reason).
//
// Drizzle credit-transaction table, comparators, and the DB seam.
import { db, creditTxns, eq, desc } from '@chokro/db';
import { withDb } from './seam';

// Row-shaped payload for a manual adjustment entry.
export interface CreateAdjustmentTransactionInput {
  userId: string;
  amount: number;
  reason?: string | null;
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

  // Record an admin adjustment as an immediately-VERIFIED ADJUST entry so the
  // balance math treats it as real funds from creation; amount is fixed 2-dp.
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
};
