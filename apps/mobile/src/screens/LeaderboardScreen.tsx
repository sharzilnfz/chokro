// LeaderboardScreen displays inter-campus circularity rankings, user campus highlight, and privacy opt-out.
import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { StateView } from '@/components/ui/StateView';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useStreaks, useSetOptOut } from '@/hooks/useStreaks';
import { getErrorMessage } from '@/services/api';
import type { CampusLeaderboardEntry, LeaderboardPeriod } from '@chokro/shared';

const PERIODS: Array<{ key: LeaderboardPeriod; label: string }> = [
  { key: 'WEEKLY', label: 'Weekly' },
  { key: 'MONTHLY', label: 'Monthly' },
  { key: 'ALL_TIME', label: 'All Time' },
];

interface LeaderboardScreenProps {
  onOpenBadges?: () => void;
  onBack?: () => void;
}

export function LeaderboardScreen({ onOpenBadges, onBack }: LeaderboardScreenProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>('WEEKLY');
  const { data, isLoading, error, refetch, isRefetching } = useLeaderboard(selectedPeriod);
  const { data: streakData, refetch: refetchStreak } = useStreaks();
  const setOptOutMutation = useSetOptOut();

  const campuses = data?.campuses ?? [];
  const myRow = data?.my_row;
  const isOptedOut = Boolean(streakData?.streak?.leaderboard_opt_out);
  const errorMessage = error ? getErrorMessage(error, 'Could not load campus rankings.') : '';

  const handleToggleOptOut = (value: boolean) => {
    // Value true means user enables switch -> optOut is false
    const newOptOutState = !value;
    setOptOutMutation.mutate(newOptOutState);
  };

  const renderCampusItem = ({ item, index }: { item: CampusLeaderboardEntry; index: number }) => {
    const rank = index + 1;
    const isTop3 = rank <= 3;
    const isMyCampus = myRow?.campus_id === item.campus_id;

    return (
      <View
        className={`flex-row items-center justify-between p-4 mb-2.5 rounded-2xl border ${
          isMyCampus
            ? 'bg-leaf-soft/70 border-leaf'
            : 'bg-surface border-border'
        }`}
      >
        <View className="flex-row items-center gap-3.5 flex-1">
          <View
            className={`w-9 h-9 rounded-xl items-center justify-center ${
              rank === 1
                ? 'bg-amber-100 border border-amber-300'
                : rank === 2
                ? 'bg-slate-200 border border-slate-300'
                : rank === 3
                ? 'bg-[#EBD2B0] border border-[#CCA879]'
                : 'bg-background border border-border'
            }`}
          >
            {rank === 1 ? (
              <Ionicons name="trophy" size={18} color="#B45309" />
            ) : (
              <Text className="text-xs font-black text-ink">#{rank}</Text>
            )}
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-base font-extrabold text-ink" numberOfLines={1}>
                {item.campus_id}
              </Text>
              {isMyCampus && (
                <View className="bg-leaf px-1.5 py-0.5 rounded-md">
                  <Text className="text-[10px] font-bold text-surface">You</Text>
                </View>
              )}
            </View>
            <Text className="text-xs text-muted mt-0.5">
              {item.member_count} active {item.member_count === 1 ? 'student' : 'students'}
            </Text>
          </View>
        </View>

        <View className="items-end pl-2">
          <Text className="text-base font-black text-leaf-dark">
            {Number(item.total_points).toFixed(0)} <Text className="text-xs font-semibold text-muted">pts</Text>
          </Text>
          <Text className="text-[10px] font-semibold text-muted">Verified Total</Text>
        </View>
      </View>
    );
  };

  return (
    <StateView
      fullScreen
      isLoading={isLoading}
      loadingTitle="Loading campus standings"
      loadingSubtitle="Materialized from verified deposit multipliers."
      error={campuses.length === 0 ? error : null}
      errorTitle="Rankings unavailable"
      errorMessage={errorMessage}
      onRetry={() => {
        void refetch();
        void refetchStreak();
      }}
      retryLabel="Try again"
    >
      <FlatList
        className="flex-1 bg-background"
        contentContainerClassName="p-5 pb-10"
        data={campuses}
        keyExtractor={(item, index) => item.id || `${item.campus_id}-${index}`}
        renderItem={renderCampusItem}
        removeClippedSubviews={Platform.OS !== 'web'}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
              void refetchStreak();
            }}
            colors={[colors.leaf]}
            tintColor={colors.leaf}
          />
        }
        ListHeaderComponent={
          <View className="mb-4">
            {/* Navigation back and header */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                {onBack && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={8}
                    className="w-9 h-9 items-center justify-center rounded-xl bg-surface border border-border active:opacity-70"
                    onPress={onBack}
                  >
                    <Ionicons name="arrow-back" size={20} color={colors.ink} />
                  </Pressable>
                )}
                <Text className="text-leaf text-xs font-extrabold tracking-widest">INTER-CAMPUS CIRCULARITY</Text>
              </View>

              {onOpenBadges && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View my badges"
                  className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-leaf-soft border border-leaf/30 active:opacity-70"
                  onPress={onOpenBadges}
                >
                  <Ionicons name="ribbon" size={16} color={colors.leafDark} />
                  <Text className="text-xs font-bold text-leaf-dark">My Badges</Text>
                </Pressable>
              )}
            </View>

            <Text accessibilityRole="header" className="text-2xl font-extrabold text-ink tracking-tight mb-1">
              Campus Leaderboard
            </Text>
            <Text className="text-sm text-muted leading-5 mb-4">
              Universities compete for circularity impact. Verified credits earned with active streak multipliers drive campus score.
            </Text>

            {/* Period selector tabs */}
            <View className="flex-row bg-surface border border-border p-1 rounded-2xl mb-4" role="tablist">
              {PERIODS.map((p) => {
                const active = selectedPeriod === p.key;
                return (
                  <Pressable
                    key={p.key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    className={`flex-1 py-2 rounded-xl items-center justify-center active:opacity-75 ${
                      active ? 'bg-leaf shadow-sm' : ''
                    }`}
                    onPress={() => setSelectedPeriod(p.key)}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        active ? 'text-surface' : 'text-muted'
                      }`}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* My campus summary card if available */}
            {myRow && (
              <View className="bg-leaf-dark p-4 rounded-2xl mb-4 shadow-card">
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="school" size={16} color="#A7F3D0" />
                    <Text className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                      Your Campus Standing
                    </Text>
                  </View>
                  <Text className="text-xs font-bold text-emerald-300">
                    {selectedPeriod.toLowerCase()}
                  </Text>
                </View>
                <View className="flex-row items-baseline justify-between mt-1">
                  <Text className="text-xl font-extrabold text-white">{myRow.campus_id}</Text>
                  <Text className="text-xl font-black text-amber-300">
                    {Number(myRow.total_points).toFixed(0)} <Text className="text-xs font-semibold text-emerald-200">pts</Text>
                  </Text>
                </View>
              </View>
            )}

            {/* Privacy opt-out toggle */}
            <View className="flex-row items-center justify-between p-3.5 bg-surface border border-border rounded-2xl mb-3">
              <View className="flex-1 pr-3">
                <Text className="text-xs font-bold text-ink">Public Campus Leaderboard</Text>
                <Text className="text-[11px] text-muted leading-4">
                  Allow your verified contributions to aggregate into your campus total.
                </Text>
              </View>
              <Switch
                value={!isOptedOut}
                onValueChange={handleToggleOptOut}
                trackColor={{ false: '#D1D5DB', true: colors.leaf }}
                thumbColor="#FFFFFF"
              />
            </View>

            {errorMessage ? (
              <Text accessibilityRole="alert" className="text-danger bg-danger-soft p-3 rounded-xl mb-3 text-xs">
                {errorMessage}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <StateView
            isEmpty
            emptyIcon="trophy-outline"
            emptyTitle="No standings calculated yet"
            emptyMessage="Points are aggregated periodically from verified deposit transactions."
            containerClassName="border border-border rounded-2xl bg-surface p-6"
          />
        }
      />
    </StateView>
  );
}
