import React, { useCallback } from 'react';
import {


  FlatList,
  Platform,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '@/services/api';
import { StateView } from '@/components/ui/StateView';
import { colors } from '@/theme';
import { categoryLabel } from '@/types';
import { useWallet, type CreditTransaction } from '@/hooks/useWallet';

const TransactionItem = React.memo(function TransactionItem({ item }: { item: CreditTransaction }) {
  const amount = Number(item.amount ?? 0);
  const isDebit = amount < 0;
  const sign = isDebit ? '-' : '+';
  const statusColor = item.status === 'VERIFIED' ? colors.leafDark : item.status === 'PENDING' ? colors.amber : colors.danger;

  return (
    <View
      className="min-h-[78px] flex-row items-center bg-surface border border-border rounded-md p-[13px] mb-[9px] shadow-card"
      style={{ elevation: 2 }}
      accessibilityLabel={`${categoryLabel(item.kind)} ${Math.abs(amount).toFixed(2)} credits, ${categoryLabel(item.status)}`}
    >
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
});

export function WalletScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useWallet();
  const balance = data?.balance ?? { verified: 0, pending: 0 };
  const transactions = data?.transactions ?? [];
  const errorMessage = error ? getErrorMessage(error, 'Could not load your wallet.') : '';

  const renderItem = useCallback(({ item }: { item: CreditTransaction }) => <TransactionItem item={item} />, []);

  return (
    <StateView
      fullScreen
      isLoading={isLoading}
      loadingTitle="Loading your ledger"
      loadingSubtitle="Balances are derived from transaction history."
      error={transactions.length === 0 ? error : null}
      errorTitle="Wallet unavailable"
      errorMessage={errorMessage}
      onRetry={() => void refetch()}
      retryLabel="Try again"
    >
      <FlatList
        className="flex-1 bg-background"
        contentContainerClassName="p-[20px] pb-[36px]"
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        removeClippedSubviews={Platform.OS !== 'web'}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
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

            {errorMessage ? <Text accessibilityRole="alert" className="text-danger bg-danger-soft p-[12px] rounded-[10px] mt-[12px] text-[13px] leading-[19px]">{errorMessage}</Text> : null}
            <Text className="text-ink text-[18px] font-extrabold mt-[24px] mb-[10px]">Ledger history</Text>
          </View>
        }
        ListEmptyComponent={
          <StateView
            isEmpty
            emptyIcon="receipt-outline"
            emptyTitle="No ledger entries yet"
            emptyMessage="Recognizing a Drop Zone in Sprint 1 does not create a deposit or credit."
            containerClassName="border border-border rounded-md bg-surface"
          />
        }
      />
    </StateView>
  );
}
