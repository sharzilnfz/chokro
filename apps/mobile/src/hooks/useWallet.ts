// Wallet overview: verified/pending balance and the credit transaction history.
// Query infra, the API client, and the shared response DTOs.
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { BalanceSummary, CreditTransactionDto } from '@chokro/shared';

export type { BalanceSummary as Balance, CreditTransactionDto as CreditTransaction };

// Aggregated result combining balance and transaction history.
type WalletData = {
  balance: BalanceSummary;
  transactions: CreditTransactionDto[];
};

// Fetches balance and transactions in parallel and normalizes their shapes.
export function useWallet() {
  return useQuery<WalletData>({
    queryKey: ['wallet'],
    // Merge both responses into a single stable result.
    queryFn: async () => {
      const [balanceData, transactionData] = await Promise.all([
        apiRequest<{ balance: BalanceSummary }>('/api/wallet/balance'),
        apiRequest<{ transactions: CreditTransactionDto[] }>('/api/wallet/transactions'),
      ]);
      return {
        balance: {
          verified: Number(balanceData.balance?.verified ?? 0),
          pending: Number(balanceData.balance?.pending ?? 0),
        },
        transactions: Array.isArray(transactionData.transactions) ? transactionData.transactions : [],
      };
    },
  });
}
