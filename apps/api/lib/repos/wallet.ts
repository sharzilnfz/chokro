import { db, creditTxns, eq, desc } from '@chokro/db';
import { withDb } from './seam';

export interface CreateAdjustmentTransactionInput {
  userId: string;
  amount: number;
  reason?: string | null;
}

export const walletRepo = {
  async findTransactionsByOwner(userId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(creditTxns)
        .where(eq(creditTxns.user_id, userId))
        .orderBy(desc(creditTxns.created_at));
    });
  },

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
