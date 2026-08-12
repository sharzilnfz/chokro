import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';

type Balance = { verified: number; pending: number };
type CreditTransaction = {
  id: string;
  amount: string | number;
  kind: 'EARN' | 'REDEEM' | 'ADJUST';
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  reason?: string | null;
  source_id?: string | null;
  created_at?: string;
};

type WalletData = {
  balance: Balance;
  transactions: CreditTransaction[];
};

export type { Balance, CreditTransaction };

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
