// walletService: route-facing facade that delegates wallet operations to
// WalletDomain so handlers depend on services, not domain internals.
//
// Domain rules plus the balance type re-exported for consumers.
import { WalletDomain, BalanceSummary } from '@/lib/domain/WalletDomain';

// Re-export so handlers can import the balance type through the service facade.
export type { BalanceSummary };

export const walletService = {
  // Sum transactions by status into a balance summary.
  calculateBalance(transactions: Array<{ amount: string | number; status: string }>): BalanceSummary {
    return WalletDomain.calculateBalance(transactions);
  },

  // A user's current balance snapshot.
  async getUserBalance(userId: string): Promise<BalanceSummary> {
    return WalletDomain.getUserBalance(userId);
  },

  // A user's raw credit history.
  async getUserTransactions(userId: string) {
    return WalletDomain.getUserTransactions(userId);
  },
};

