// Wallet overview: verified/pending balance and the credit transaction history.
// Query infra and the API client.
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';

// Verified vs pending credit totals.
type Balance = { verified: number; pending: number };
// A single credit movement with kind, status, and optional reason.
type CreditTransaction = {
  id: string;
  amount: string | number;
  kind: 'EARN' | 'REDEEM' | 'ADJUST';
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  reason?: string | null;
  source_id?: string | null;
  created_at?: string;
};

// Aggregated result combining balance and transaction history.
type WalletData = {
  balance: Balance;
  transactions: CreditTransaction[];
};

export type { Balance, CreditTransaction };

// Fetches balance and transactions in parallel and normalizes their shapes.
export function useWallet() {
  return useQuery<WalletData>({
    queryKey: ['wallet'],
    // Merge both responses into a single stable result.
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
