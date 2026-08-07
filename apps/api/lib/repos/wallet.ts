import { db, creditTxns, memoryStore } from '@chokro/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { databaseOrTestStore } from '../database';

export interface CreateAdjustmentData {
  userId: string;
  amount: number;
  reason: string;
}

export const walletRepo = {
  async findTransactionsByOwner(ownerId: string) {
    return databaseOrTestStore(
      () => db.select().from(creditTxns).where(eq(creditTxns.user_id, ownerId)),
      () => memoryStore.creditTxns.filter((txn) => txn.user_id === ownerId),
    );
  },

  async createAdjustmentTransaction(data: CreateAdjustmentData) {
    const values = {
      user_id: data.userId,
      amount: data.amount.toString(),
      kind: 'ADJUST',
      reason: data.reason,
      status: 'VERIFIED',
    };

    return databaseOrTestStore(
      async () => (await db.insert(creditTxns).values(values).returning())[0],
      () => {
        const adjustment = {
          id: crypto.randomUUID(),
          ...values,
          created_at: new Date(),
        };
        memoryStore.creditTxns.push(adjustment);
        return adjustment;
      },
    );
  },
};
