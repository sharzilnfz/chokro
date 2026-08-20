// MyBadgesScreen displays active streak status, multiplier, earned badges, and native share sheet integration.
import React from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { StateView } from '@/components/ui/StateView';
import { useBadges, type MobileBadgeAward } from '@/hooks/useBadges';
import { useStreaks } from '@/hooks/useStreaks';
import { BADGE_DEFINITIONS_LIST } from '@chokro/shared';
import { getErrorMessage } from '@/services/api';

interface MyBadgesScreenProps {
  onBack?: () => void;
  onOpenLeaderboard?: () => void;
}

export function MyBadgesScreen({ onBack, onOpenLeaderboard }: MyBadgesScreenProps) {
  const { data: badgesData, isLoading, error, refetch, isRefetching } = useBadges();
  const { data: streakData, refetch: refetchStreak } = useStreaks();

  const earnedBadges = badgesData?.badges ?? [];
  const streak = streakData?.streak ?? {
    current_streak_days: 0,
    longest_streak_days: 0,
    streak_multiplier: '1.00',
    last_active_at: null,
    leaderboard_opt_out: false,
  };

  const earnedTypesSet = new Set(earnedBadges.map((b) => b.badge_type));

  const handleShareBadge = async (badge: MobileBadgeAward) => {
    try {
      const title = badge.definition?.title || 'Circular Economy Milestone';
      const shareUrl = `https://chokro.org/badges/${badge.id}`;
      await Share.share({
        title: `${title} | Chokro Verified Badge`,
        message: `I just earned the "${title}" badge on Chokro for verified circular economy impact! Check my verified proof: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (err) {
      console.warn('Share dismissed or failed', err);
    }
  };

  const renderBadgeCard = ({ item }: { item: MobileBadgeAward }) => {
    const title = item.definition?.title || item.badge_type.replace(/_/g, ' ');
    const desc = item.definition?.description || 'Verified environmental milestone.';
    const dateStr = new Date(item.awarded_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return (
      <View className="bg-surface border border-border p-4 rounded-2xl mb-3 shadow-sm">
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center gap-3 flex-1 pr-2">
            <View className="w-12 h-12 rounded-2xl bg-leaf-soft border border-leaf/40 items-center justify-center">
              <Ionicons name="ribbon" size={24} color={colors.leafDark} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-ink">{title}</Text>
              <Text className="text-xs text-muted mt-0.5 leading-4">{desc}</Text>
            </View>
          </View>

          <View className="items-end">
            <View className="bg-amber-soft px-2 py-0.5 rounded-md border border-amber/30">
              <Text className="text-xs font-bold text-amber">+{item.award_points} pts</Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-border/60">
          <Text className="text-[11px] font-medium text-muted">Awarded: {dateStr}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Share ${title} badge`}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-leaf-soft active:opacity-70"
            onPress={() => void handleShareBadge(item)}
          >
            <Ionicons name="share-social-outline" size={14} color={colors.leafDark} />
            <Text className="text-xs font-bold text-leaf-dark">Share Badge</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <StateView
      fullScreen
      isLoading={isLoading}
      loadingTitle="Loading badges & streaks"
      loadingSubtitle="Verifying milestone awards."
      error={earnedBadges.length === 0 ? error : null}
      errorTitle="Badges unavailable"
      errorMessage={error ? getErrorMessage(error, 'Could not load your badges.') : ''}
      onRetry={() => {
        void refetch();
        void refetchStreak();
      }}
      retryLabel="Try again"
    >
      <FlatList
        className="flex-1 bg-background"
        contentContainerClassName="p-5 pb-10"
        data={earnedBadges}
        keyExtractor={(item) => item.id}
        renderItem={renderBadgeCard}
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
            {/* Header and back action */}
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
                <Text className="text-leaf text-xs font-extrabold tracking-widest">REWARDS & MILESTONES</Text>
              </View>

              {onOpenLeaderboard && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View leaderboard"
                  className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border active:opacity-70"
                  onPress={onOpenLeaderboard}
                >
                  <Ionicons name="trophy-outline" size={16} color={colors.ink} />
                  <Text className="text-xs font-bold text-ink">Leaderboard</Text>
                </Pressable>
              )}
            </View>

            <Text accessibilityRole="header" className="text-2xl font-extrabold text-ink tracking-tight mb-1">
              My Badges & Streaks
            </Text>
            <Text className="text-sm text-muted leading-5 mb-4">
              Consecutive recycling activity multiplies your campus points and earns verified digital badges.
            </Text>

            {/* Streak & Multiplier Card */}
            <View className="bg-leaf-dark rounded-2xl p-5 mb-5 shadow-card">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 items-center justify-center">
                    <Ionicons name="flame" size={22} color="#F59E0B" />
                  </View>
                  <View>
                    <Text className="text-[11px] font-extrabold text-emerald-200 uppercase tracking-wider">
                      Daily Engagement Streak
                    </Text>
                    <Text className="text-xl font-black text-white">
                      {streak.current_streak_days} {streak.current_streak_days === 1 ? 'Day' : 'Days'} Active
                    </Text>
                  </View>
                </View>

                <View className="items-end bg-emerald-800/70 border border-emerald-600/40 px-3 py-1.5 rounded-xl">
                  <Text className="text-[10px] font-bold text-emerald-300 uppercase">Multiplier</Text>
                  <Text className="text-lg font-black text-amber-300">{streak.streak_multiplier}x</Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-emerald-800/80">
                <Text className="text-xs text-emerald-200">
                  Longest record: <Text className="font-bold text-white">{streak.longest_streak_days} days</Text>
                </Text>
                <Text className="text-[11px] text-emerald-300">
                  +0.10x per active day (max 2.00x)
                </Text>
              </View>
            </View>

            <Text className="text-base font-extrabold text-ink mb-2">Earned Badges ({earnedBadges.length})</Text>
          </View>
        }
        ListEmptyComponent={
          <View className="bg-surface border border-border p-5 rounded-2xl items-center mb-6">
            <Ionicons name="ribbon-outline" size={32} color={colors.muted} />
            <Text className="text-sm font-bold text-ink mt-2">No badges earned yet</Text>
            <Text className="text-xs text-muted text-center mt-1 leading-4">
              Complete your first verified deposit or maintain consecutive streaks to unlock badges.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View className="mt-4">
            <Text className="text-base font-extrabold text-ink mb-2">Milestone Directory</Text>
            {BADGE_DEFINITIONS_LIST.map((def) => {
              const isEarned = earnedTypesSet.has(def.type);
              return (
                <View
                  key={def.type}
                  className={`flex-row items-center justify-between p-3.5 mb-2 rounded-xl border ${
                    isEarned
                      ? 'bg-leaf-soft/40 border-leaf/30 opacity-90'
                      : 'bg-surface/50 border-border/70 opacity-60'
                  }`}
                >
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <Ionicons
                      name={isEarned ? 'checkmark-circle' : 'lock-closed'}
                      size={20}
                      color={isEarned ? colors.leaf : colors.muted}
                    />
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-ink">{def.title}</Text>
                      <Text className="text-[11px] text-muted">{def.criteria}</Text>
                    </View>
                  </View>
                  <Text className={`text-[11px] font-bold ${isEarned ? 'text-leaf-dark' : 'text-muted'}`}>
                    {isEarned ? 'Unlocked' : 'Locked'}
                  </Text>
                </View>
              );
            })}
          </View>
        }
      />
    </StateView>
  );
}
