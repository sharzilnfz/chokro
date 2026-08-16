import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Balance, CreditTransaction, WalletData } from '@/types';

export type { Balance, CreditTransaction, WalletData };


export function useWallet() {
  return useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const [balanceData, transactionData] = await Promise.all([
        apiRequest<{ balance: Balance }>('/api/wallet/balance'),
        apiRequest<{ transactions: CreditTransaction[] }>('/api/wallet/transactions'),
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
