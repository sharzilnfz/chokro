import { WalletDomain, BalanceSummary } from '@/lib/domain/WalletDomain';

export type { BalanceSummary };

export const walletService = {
  calculateBalance(transactions: Array<{ amount: string | number; status: string }>): BalanceSummary {
    return WalletDomain.calculateBalance(transactions);
  },

  async getUserBalance(userId: string): Promise<BalanceSummary> {
    return WalletDomain.getUserBalance(userId);
  },

  async getUserTransactions(userId: string) {
    return WalletDomain.getUserTransactions(userId);
  },
};

