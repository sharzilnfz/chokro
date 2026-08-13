import { walletRepo } from '@/lib/repos/wallet';

export interface BalanceSummary {
  verified: number;
  pending: number;
}

export const WalletDomain = {
  calculateBalance(transactions: Array<{ amount: string | number; status: string }>): BalanceSummary {
    let verified = 0;
    let pending = 0;

    for (const txn of transactions) {
      const amount = Number(txn.amount);
      if (!Number.isFinite(amount)) continue;
      if (txn.status === 'VERIFIED') verified += amount;
      if (txn.status === 'PENDING') pending += amount;
    }

    return { verified, pending };
  },

  async getUserBalance(userId: string): Promise<BalanceSummary> {
    const txns = await walletRepo.findTransactionsByOwner(userId);
    return this.calculateBalance(txns);
  },

  async getUserTransactions(userId: string) {
    return walletRepo.findTransactionsByOwner(userId);
  },

  async createAdjustment(input: {
    userId: string;
    amount: string | number;
    reason?: string | null;
    description?: string | null;
  }) {
    const numAmount = Number(input.amount);
    if (!Number.isFinite(numAmount)) {
      throw new Error('Invalid adjustment amount');
    }

    return walletRepo.createAdjustmentTransaction({
      userId: input.userId,
      amount: numAmount,
      reason: input.reason || input.description || null,
    });
  },
};
