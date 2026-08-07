import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, getErrorMessage } from '../api';
import { colors } from '../theme';
import { categoryLabel } from '../types';

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

export function WalletScreen({ token }: { token: string }) {
  const [balance, setBalance] = useState<Balance>({ verified: 0, pending: 0 });
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadWallet = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [balanceData, transactionData] = await Promise.all([
        apiRequest<{ balance: Balance }>('/api/wallet/balance', { token }),
        apiRequest<{ transactions: CreditTransaction[] }>('/api/wallet/transactions', { token }),
      ]);
      setBalance({
        verified: Number(balanceData.balance?.verified ?? 0),
        pending: Number(balanceData.balance?.pending ?? 0),
      });
      setTransactions(Array.isArray(transactionData.transactions) ? transactionData.transactions : []);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Could not load your wallet.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadWallet();
  }, [token]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-[28px]" accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.leaf} size="large" />
        <Text className="text-ink text-[18px] font-extrabold text-center mt-[11px]">Loading your ledger</Text>
        <Text className="text-muted text-[14px] leading-[20px] text-center mt-[6px]">Balances are derived from transaction history.</Text>
      </View>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-[28px]" accessibilityRole="alert">
        <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
        <Text className="text-ink text-[18px] font-extrabold text-center mt-[11px]">Wallet unavailable</Text>
        <Text className="text-muted text-[14px] leading-[20px] text-center mt-[6px]">{error}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading wallet"
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          onPress={() => void loadWallet()}
        >
          <Text className="text-surface text-[14px] font-extrabold">Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="p-[20px] pb-[36px]"
      data={transactions}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadWallet(true)}
          colors={[colors.leaf]}
          tintColor={colors.leaf}
        />
      }
      ListHeaderComponent={
        <View>
          <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">APPEND-ONLY LEDGER</Text>
          <Text accessibilityRole="header" className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]">Green Credits</Text>
          <Text className="text-muted text-[14px] leading-[21px] mt-[6px] mb-[18px]">One credit equals ৳1. Only verified outcomes count toward spendable balance.</Text>

          <View className="bg-leaf-dark rounded-lg p-[20px] min-h-[190px] justify-end shadow-card" style={{ elevation: 2 }} accessibilityLabel={`Verified balance ${balance.verified.toFixed(2)} Green Credits`}>
            <View className="absolute top-[18px] right-[18px] w-[48px] h-[48px] rounded-[16px] bg-leaf items-center justify-center">
              <Ionicons name="shield-checkmark" size={23} color={colors.surface} />
            </View>
            <Text className="text-[#BBD5C5] text-[11px] font-extrabold tracking-[1.2px]">VERIFIED BALANCE</Text>
            <Text className="text-surface text-[47px] leading-[53px] font-extrabold tracking-[-1.8px] mt-[4px]">{balance.verified.toFixed(2)}</Text>
            <Text className="text-[#DCEADF] text-[13px] font-semibold">Green Credits</Text>
          </View>

          <View className="flex-row items-center justify-between gap-[14px] border border-[#E4C991] rounded-md bg-amber-soft p-[16px] mt-[12px]" accessibilityLabel={`Pending balance ${balance.pending.toFixed(2)} Green Credits`}>
            <View>
              <Text className="text-amber text-[14px] font-extrabold">Pending verification</Text>
              <Text className="text-muted text-[11px] leading-[16px] mt-[3px] max-w-[230px]">Not spendable until a Trust Gate decision verifies the outcome.</Text>
            </View>
            <Text className="text-amber text-[24px] font-extrabold">{balance.pending.toFixed(2)}</Text>
          </View>

          {error ? <Text accessibilityRole="alert" className="text-danger bg-danger-soft p-[12px] rounded-[10px] mt-[12px] text-[13px] leading-[19px]">{error}</Text> : null}
          <Text className="text-ink text-[18px] font-extrabold mt-[24px] mb-[10px]">Ledger history</Text>
        </View>
      }
      renderItem={({ item }) => {
        const amount = Number(item.amount ?? 0);
        const isDebit = amount < 0;
        const isCredit = amount > 0;
        const sign = isDebit ? '-' : '+';
        const statusColor = item.status === 'VERIFIED' ? colors.leafDark : item.status === 'PENDING' ? colors.amber : colors.danger;
        return (
          <View className="min-h-[78px] flex-row items-center bg-surface border border-border rounded-md p-[13px] mb-[9px] shadow-card" style={{ elevation: 2 }} accessibilityLabel={`${categoryLabel(item.kind)} ${Math.abs(amount).toFixed(2)} credits, ${categoryLabel(item.status)}`}>
            <View className={`w-[44px] h-[44px] rounded-[14px] items-center justify-center ${isDebit ? 'bg-danger-soft' : 'bg-leaf-soft'}`}>
              <Ionicons name={isDebit ? 'arrow-up' : 'arrow-down'} size={19} color={isDebit ? colors.danger : colors.leafDark} />
            </View>
            <View className="flex-1 mx-[11px]">
              <Text className="text-ink text-[14px] font-extrabold">{categoryLabel(item.kind)}</Text>
              <Text className="text-[11px] font-extrabold mt-[2px]" style={{ color: statusColor }}>{categoryLabel(item.status)}</Text>
              {item.reason ? <Text className="text-muted text-[11px] leading-[16px] mt-[2px]">{item.reason}</Text> : null}
            </View>
            <Text className={`text-[16px] font-extrabold ${isDebit ? 'text-danger' : 'text-leaf-dark'}`}>{sign}{Math.abs(amount).toFixed(2)}</Text>
          </View>
        );
      }}
      ListEmptyComponent={
        <View className="items-center p-[28px] border border-border rounded-md bg-surface">
          <Ionicons name="receipt-outline" size={31} color={colors.leaf} />
          <Text className="text-ink text-[16px] font-extrabold mt-[9px]">No ledger entries yet</Text>
          <Text className="text-muted text-[13px] leading-[19px] text-center mt-[5px]">Recognizing a Drop Zone in Sprint 1 does not create a deposit or credit.</Text>
        </View>
      }
    />
  );
}

