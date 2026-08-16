import React, { useCallback } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '@/services/api';
import { TransactionItem } from '@/components/TransactionItem';
import { StateView } from '@/components/ui/StateView';
import { colors } from '@/theme';
import { useWallet, type CreditTransaction } from '@/hooks/useWallet';

export function WalletScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useWallet();
  const balance = data?.balance ?? { verified: 0, pending: 0 };
  const transactions = data?.transactions ?? [];
  const errorMessage = error ? getErrorMessage(error, 'Could not load your wallet.') : '';

  const renderItem = useCallback(
    ({ item }: { item: CreditTransaction }) => (
      <Animated.View entering={FadeInUp.duration(200)}>
        <TransactionItem item={item} />
      </Animated.View>
    ),
    [],
  );


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

            <Animated.View entering={FadeInDown.duration(350)} className="bg-leaf-dark rounded-lg p-[20px] min-h-[190px] justify-end shadow-card" style={{ elevation: 2 }} accessibilityLabel={`Verified balance ${balance.verified.toFixed(2)} Green Credits`}>
              <View className="absolute top-[18px] right-[18px] w-[48px] h-[48px] rounded-[16px] bg-leaf items-center justify-center">
                <Ionicons name="shield-checkmark" size={23} color={colors.surface} />
              </View>
              <Text className="text-[#BBD5C5] text-[11px] font-extrabold tracking-[1.2px]">VERIFIED BALANCE</Text>
              <Text className="text-surface text-[47px] leading-[53px] font-extrabold tracking-[-1.8px] mt-[4px]">{balance.verified.toFixed(2)}</Text>
              <Text className="text-[#DCEADF] text-[13px] font-semibold">Green Credits</Text>
            </Animated.View>


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
