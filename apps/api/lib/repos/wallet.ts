import { creditTxns, memoryStore } from '@chokro/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { withDb, createRepoSeam } from './seam';

export interface CreateAdjustmentData {
  userId: string;
  amount: number;
  reason: string;
}

export interface WalletRepo {
  findTransactionsByOwner(ownerId: string): Promise<Array<typeof creditTxns.$inferSelect>>;
  createAdjustmentTransaction(data: CreateAdjustmentData): Promise<typeof creditTxns.$inferSelect>;
}

export const drizzleWalletRepo: WalletRepo = {
  async findTransactionsByOwner(ownerId: string) {
    return withDb(async (db) => db.select().from(creditTxns).where(eq(creditTxns.user_id, ownerId)));
  },

  async createAdjustmentTransaction(data: CreateAdjustmentData) {
    const values = {
      user_id: data.userId,
      amount: data.amount.toString(),
      kind: 'ADJUST',
      reason: data.reason,
      status: 'VERIFIED',
    };

    return withDb(async (db) => {
      const rows = await db.insert(creditTxns).values(values).returning();
      return rows[0];
    });
  },
};

export const memoryWalletRepo: WalletRepo = {
  async findTransactionsByOwner(ownerId: string) {
    return memoryStore.creditTxns.filter((txn) => txn.user_id === ownerId);
  },

  async createAdjustmentTransaction(data: CreateAdjustmentData) {
    const values = {
      user_id: data.userId,
      amount: data.amount.toString(),
      kind: 'ADJUST',
      reason: data.reason,
      status: 'VERIFIED',
    };

    const adjustment = {
      id: crypto.randomUUID(),
      ...values,
      created_at: new Date(),
    };
    memoryStore.creditTxns.push(adjustment);
    return adjustment as any;
  },
};

export const walletRepo: WalletRepo = createRepoSeam(drizzleWalletRepo, memoryWalletRepo);
