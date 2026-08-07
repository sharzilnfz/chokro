import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

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
  const { token } = useAuth();

  return useQuery<WalletData>({
    queryKey: ['wallet', token],
    queryFn: async () => {
      const [balanceData, transactionData] = await Promise.all([
        apiRequest<{ balance: Balance }>('/api/wallet/balance', { token }),
        apiRequest<{ transactions: CreditTransaction[] }>('/api/wallet/transactions', { token }),
      ]);
      return {
        balance: {
          verified: Number(balanceData.balance?.verified ?? 0),
          pending: Number(balanceData.balance?.pending ?? 0),
        },
        transactions: Array.isArray(transactionData.transactions) ? transactionData.transactions : [],
      };
    },
    enabled: !!token,
  });
}
