// WalletScreen shows the "Green Credits" screen: verified and pending balances,
// active streak multiplier, quick access to campus leaderboard/badges, and append-only ledger history.
import React, { useCallback } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '@/services/api';
import { TransactionItem } from '@/components/TransactionItem';
import { StateView } from '@/components/ui/StateView';
import { colors } from '@/theme';
import { useWallet, type CreditTransaction } from '@/hooks/useWallet';
import { useStreaks } from '@/hooks/useStreaks';
import { usePartner } from '@/hooks/usePartner';

interface WalletScreenProps {
  onOpenLeaderboard?: () => void;
  onOpenBadges?: () => void;
  onOpenPartner?: () => void;
  onOpenRedemption?: () => void;
}

export function WalletScreen({ onOpenLeaderboard, onOpenBadges, onOpenPartner, onOpenRedemption }: WalletScreenProps) {
  const { data, isLoading, error, refetch, isRefetching } = useWallet();
  const { data: streakData, refetch: refetchStreak } = useStreaks();
  const { data: partnerData, refetch: refetchPartner } = usePartner();

  const balance = data?.balance ?? { verified: 0, pending: 0 };
  const transactions = data?.transactions ?? [];
  const streak = streakData?.streak;
  const partner = partnerData?.partner;

  const errorMessage = error ? getErrorMessage(error, 'Could not load your wallet.') : '';

  const handleRefreshAll = () => {
    void refetch();
    void refetchStreak();
    void refetchPartner();
  };

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
      onRetry={handleRefreshAll}
      retryLabel="Try again"
    >
      <FlatList
        className="flex-1 bg-background"
        contentContainerClassName="p-5 pb-10"
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
            onRefresh={handleRefreshAll}
            colors={[colors.leaf]}
            tintColor={colors.leaf}
          />
        }
        ListHeaderComponent={
          <View>
            <Text className="text-leaf text-xs font-extrabold tracking-widest">APPEND-ONLY LEDGER</Text>
            <Text accessibilityRole="header" className="text-3xl font-extrabold text-ink tracking-tight mt-1">
              Green Credits
            </Text>
            <Text className="text-sm text-muted leading-5 mt-1.5 mb-4">
              One credit equals ৳1. Only verified outcomes count toward spendable balance.
            </Text>

            {/* Spendable balance card */}
            <View
              className="bg-leaf-dark rounded-3xl p-5 min-h-[180px] justify-between shadow-card mb-3"
              accessibilityLabel={`Verified balance ${balance.verified.toFixed(2)} Green Credits`}
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-[#BBD5C5] text-[11px] font-extrabold tracking-wider">VERIFIED BALANCE</Text>
                  <Text className="text-surface text-4xl font-black tracking-tight mt-1">
                    {balance.verified.toFixed(2)}
                  </Text>
                  <Text className="text-[#DCEADF] text-xs font-semibold mt-0.5">Green Credits</Text>
                </View>
                <View className="w-12 h-12 rounded-2xl bg-leaf items-center justify-center">
                  <Ionicons name="shield-checkmark" size={24} color={colors.surface} />
                </View>
              </View>

              {onOpenRedemption && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cash out Green Credits via MFS"
                  className="mt-4 min-h-[44px] rounded-2xl bg-surface flex-row items-center justify-center gap-2 active:opacity-80"
                  onPress={onOpenRedemption}
                >
                  <Ionicons name="cash-outline" size={18} color={colors.leafDark} />
                  <Text className="text-leaf-dark text-sm font-black">Cash Out (MFS Payout)</Text>
                </Pressable>
              )}
            </View>

            {/* Pending credits card */}
            <View
              className="flex-row items-center justify-between gap-3 border border-[#E4C991] rounded-2xl bg-amber-soft p-4 mb-4"
              accessibilityLabel={`Pending balance ${balance.pending.toFixed(2)} Green Credits`}
            >
              <View className="flex-1">
                <Text className="text-amber text-sm font-extrabold">Pending verification</Text>
                <Text className="text-muted text-xs leading-4 mt-0.5">
                  Not spendable until a Trust Gate decision verifies the outcome.
                </Text>
              </View>
              <Text className="text-amber text-xl font-black">{balance.pending.toFixed(2)}</Text>
            </View>

            {/* Engagement Streak & Multiplier Quick Action Widget */}
            {streak && (
              <View className="bg-surface border border-border p-4 rounded-2xl mb-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2.5">
                    <View className="w-9 h-9 rounded-xl bg-amber-500/20 items-center justify-center">
                      <Ionicons name="flame" size={20} color="#F59E0B" />
                    </View>
                    <View>
                      <Text className="text-xs font-extrabold text-ink">
                        {streak.current_streak_days}-Day Active Streak
                      </Text>
                      <Text className="text-[11px] text-muted">
                        Active multiplier: <Text className="font-bold text-leaf-dark">{streak.streak_multiplier}x</Text>
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2">
                    {onOpenBadges && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="View badges"
                        className="px-2.5 py-1.5 rounded-xl bg-leaf-soft active:opacity-70"
                        onPress={onOpenBadges}
                      >
                        <Text className="text-xs font-bold text-leaf-dark">Badges</Text>
                      </Pressable>
                    )}
                    {onOpenLeaderboard && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="View leaderboard"
                        className="px-2.5 py-1.5 rounded-xl bg-leaf active:opacity-70"
                        onPress={onOpenLeaderboard}
                      >
                        <Text className="text-xs font-bold text-surface">Standings</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Partner Portal Quick Entry */}
            {onOpenPartner && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open partner hub"
                className={`flex-row items-center justify-between p-4 rounded-2xl border mb-4 active:opacity-75 ${
                  partner?.status === 'VERIFIED'
                    ? 'bg-leaf-soft border-leaf'
                    : partner?.status === 'APPLIED'
                      ? 'bg-amber-soft border-amber/40'
                      : partner?.status === 'REJECTED'
                        ? 'bg-danger-soft border-danger/40'
                        : 'bg-surface border-border'
                }`}
                onPress={onOpenPartner}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className={`w-9 h-9 rounded-xl items-center justify-center ${
                      partner?.status === 'VERIFIED'
                        ? 'bg-leaf'
                        : partner?.status === 'APPLIED'
                          ? 'bg-amber/20'
                          : partner?.status === 'REJECTED'
                            ? 'bg-danger/20'
                            : 'bg-leaf-soft'
                    }`}
                  >
                    <Ionicons
                      name={
                        partner?.status === 'VERIFIED'
                          ? 'shield-checkmark'
                          : partner?.status === 'APPLIED'
                            ? 'time-outline'
                            : partner?.status === 'REJECTED'
                              ? 'alert-circle-outline'
                              : 'business-outline'
                      }
                      size={18}
                      color={
                        partner?.status === 'VERIFIED'
                          ? colors.surface
                          : partner?.status === 'APPLIED'
                            ? colors.amber
                            : partner?.status === 'REJECTED'
                              ? colors.danger
                              : colors.leafDark
                      }
                    />
                  </View>
                  <View>
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-xs font-extrabold text-ink">
                        {partner?.status === 'VERIFIED'
                          ? 'Partner Console'
                          : partner?.status === 'APPLIED'
                            ? 'Partner Hub (In Review)'
                            : partner?.status === 'REJECTED'
                              ? 'Partner Application'
                              : 'Join as Recycling Partner'}
                      </Text>
                      {partner?.status === 'VERIFIED' ? (
                        <View className="px-1.5 py-0.5 rounded bg-leaf">
                          <Text className="text-[9px] font-black text-surface">VERIFIED</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="text-[11px] text-muted mt-0.5">
                      {partner?.status === 'VERIFIED'
                        ? 'Manage collection queue, pickups & capabilities'
                        : partner?.status === 'APPLIED'
                          ? 'Application under review by Chokro team'
                          : partner?.status === 'REJECTED'
                            ? 'Feedback provided — review & re-apply'
                            : 'Collect, repair, or process circular deposits'}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={partner?.status === 'VERIFIED' ? colors.leafDark : colors.muted}
                />
              </Pressable>
            )}

            {errorMessage ? (
              <Text accessibilityRole="alert" className="text-danger bg-danger-soft p-3 rounded-xl mb-3 text-xs">
                {errorMessage}
              </Text>
            ) : null}

            <Text className="text-base font-extrabold text-ink mt-2 mb-2.5">Ledger history</Text>
          </View>
        }
        ListEmptyComponent={
          <StateView
            isEmpty
            emptyIcon="receipt-outline"
            emptyTitle="No ledger entries yet"
            emptyMessage="Recognizing a Drop Zone or completing a circular deposit adds entries to your ledger."
            containerClassName="border border-border rounded-2xl bg-surface p-6"
          />
        }
      />
    </StateView>
  );
}
