import { walletRepo } from '@/lib/repos/wallet';

export interface BalanceSummary {
  verified: number;
  pending: number;
}

export const walletService = {
  calculateBalance(transactions: Array<{ amount: string | number; status: string }>): BalanceSummary {
    let verified = 0;
    let pending = 0;

    for (const txn of transactions) {
      const amount = Number(txn.amount);
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
};
