// ImpactDashboardScreen (M16): Personal Verified Impact, Avoided CO2e, Category & Path Breakdown, and Equivalencies
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
import { usePersonalImpact } from '@/hooks/useImpact';
import { getErrorMessage } from '@/services/api';
import type { ImpactRecord } from '@chokro/shared';

interface ImpactDashboardScreenProps {
  onBack?: () => void;
  onOpenCertificate?: (ref: string) => void;
}

export function ImpactDashboardScreen({ onBack, onOpenCertificate }: ImpactDashboardScreenProps) {
  const { data: impact, isLoading, error, refetch, isRefetching } = usePersonalImpact();

  const totalDivertedKg = impact?.totalDivertedKg ?? 0;
  const totalAvoidedCo2eKg = impact?.totalAvoidedCo2eKg ?? 0;
  const comparisons = impact?.comparisons ?? {
    treeEquivalents: 0,
    kmDrivenAvoided: 0,
    smartphoneCharges: 0,
  };
  const byCategory = impact?.byCategory ?? [];
  const byPath = impact?.byPath ?? [];
  const records = impact?.records ?? [];

  const handleShareImpact = async () => {
    try {
      const shareText = `I have diverted ${totalDivertedKg.toFixed(1)} kg of material and avoided ${totalAvoidedCo2eKg.toFixed(2)} kg of CO2e on Chokro! That is equal to planting ${comparisons.treeEquivalents.toFixed(1)} trees! 🌿`;
      await Share.share({
        title: 'My Verified Environmental Impact | Chokro',
        message: shareText,
      });
    } catch (err) {
      console.warn('Share dismissed or failed', err);
    }
  };

  const renderRecordItem = ({ item }: { item: ImpactRecord }) => {
    const dateStr = item.created_at
      ? new Date(item.created_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Recent';

    return (
      <View className="bg-surface border border-border p-3.5 rounded-2xl mb-2.5 shadow-sm flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1 pr-2">
          <View className="w-10 h-10 rounded-xl bg-leaf-soft border border-leaf/30 items-center justify-center">
            <Ionicons
              name={
                item.category === 'E_WASTE'
                  ? 'hardware-chip-outline'
                  : item.category === 'PLASTICS'
                    ? 'water-outline'
                    : item.category === 'METAL'
                      ? 'cube-outline'
                      : 'leaf-outline'
              }
              size={20}
              color={colors.leafDark}
            />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs font-extrabold text-ink">{item.category}</Text>
              <View className="px-1.5 py-0.2 rounded bg-leaf-soft">
                <Text className="text-[9px] font-black text-leaf-dark uppercase">{item.next_life_path}</Text>
              </View>
            </View>
            <Text className="text-[11px] text-muted mt-0.5">{dateStr} • Factor: {item.factor_version}</Text>
          </View>
        </View>

        <View className="items-end">
          <Text className="text-xs font-black text-ink">{Number(item.mass_kg).toFixed(1)} kg</Text>
          <Text className="text-[10px] font-bold text-leaf-dark">-{Number(item.avoided_co2e_kg).toFixed(2)} kg CO₂e</Text>
        </View>
      </View>
    );
  };

  return (
    <StateView
      fullScreen
      isLoading={isLoading}
      loadingTitle="Loading your impact ledger"
      loadingSubtitle="Deriving avoided emissions from verified Trust Gate records."
      error={records.length === 0 ? error : null}
      errorTitle="Impact ledger unavailable"
      errorMessage={error ? getErrorMessage(error, 'Could not load your impact metrics.') : ''}
      onRetry={() => void refetch()}
      retryLabel="Try again"
    >
      <FlatList
        className="flex-1 bg-background"
        contentContainerClassName="p-5 pb-10"
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={renderRecordItem}
        removeClippedSubviews={Platform.OS !== 'web'}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            colors={[colors.leaf]}
            tintColor={colors.leaf}
          />
        }
        ListHeaderComponent={
          <View className="mb-4">
            {/* Top Bar */}
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
                <Text className="text-leaf text-xs font-extrabold tracking-widest uppercase">
                  VERIFIED IMPACT LEDGER
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share impact summary"
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-leaf active:opacity-70"
                onPress={() => void handleShareImpact()}
              >
                <Ionicons name="share-social-outline" size={14} color={colors.surface} />
                <Text className="text-xs font-bold text-surface">Share</Text>
              </Pressable>
            </View>

            <Text accessibilityRole="header" className="text-2xl font-extrabold text-ink tracking-tight mb-1">
              My Environmental Impact
            </Text>
            <Text className="text-xs text-muted leading-4 mb-4">
              Calculated exclusively from verified custody handovers and physical scale readings.
            </Text>

            {/* Hero Metric Cards */}
            <View className="flex-row gap-3 mb-4">
              {/* Diverted Mass */}
              <View className="flex-1 bg-leaf-dark rounded-2xl p-4 shadow-card">
                <View className="w-8 h-8 rounded-xl bg-leaf items-center justify-center mb-2">
                  <Ionicons name="scale-outline" size={18} color={colors.surface} />
                </View>
                <Text className="text-[#BBD5C5] text-[10px] font-extrabold uppercase tracking-wider">
                  Diverted Mass
                </Text>
                <Text className="text-surface text-2xl font-black tracking-tight mt-0.5">
                  {totalDivertedKg.toFixed(1)}
                </Text>
                <Text className="text-[#DCEADF] text-[10px] font-semibold mt-0.5">Kilograms</Text>
              </View>

              {/* Avoided CO2e */}
              <View className="flex-1 bg-[#164E63] rounded-2xl p-4 shadow-card">
                <View className="w-8 h-8 rounded-xl bg-[#0891B2] items-center justify-center mb-2">
                  <Ionicons name="cloud-done-outline" size={18} color={colors.surface} />
                </View>
                <Text className="text-[#A5F3FC] text-[10px] font-extrabold uppercase tracking-wider">
                  Avoided CO₂e
                </Text>
                <Text className="text-surface text-2xl font-black tracking-tight mt-0.5">
                  {totalAvoidedCo2eKg.toFixed(2)}
                </Text>
                <Text className="text-[#CFFAFE] text-[10px] font-semibold mt-0.5">kg CO₂e GHG</Text>
              </View>
            </View>

            {/* Equivalencies Carousel / Grid */}
            <View className="bg-surface border border-border p-4 rounded-2xl mb-4">
              <Text className="text-xs font-extrabold text-ink uppercase tracking-wider mb-2.5">
                Real-World Equivalencies
              </Text>
              <View className="flex-row items-center justify-between">
                <View className="items-center flex-1">
                  <View className="w-9 h-9 rounded-xl bg-emerald-50 items-center justify-center mb-1">
                    <Ionicons name="leaf" size={18} color="#059669" />
                  </View>
                  <Text className="text-xs font-black text-ink">{comparisons.treeEquivalents.toFixed(1)}</Text>
                  <Text className="text-[10px] text-muted text-center">Trees / yr</Text>
                </View>

                <View className="w-[1px] h-8 bg-border" />

                <View className="items-center flex-1">
                  <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center mb-1">
                    <Ionicons name="car-outline" size={18} color="#2563EB" />
                  </View>
                  <Text className="text-xs font-black text-ink">{comparisons.kmDrivenAvoided.toFixed(1)}</Text>
                  <Text className="text-[10px] text-muted text-center">km avoided</Text>
                </View>

                <View className="w-[1px] h-8 bg-border" />

                <View className="items-center flex-1">
                  <View className="w-9 h-9 rounded-xl bg-amber-50 items-center justify-center mb-1">
                    <Ionicons name="battery-charging-outline" size={18} color="#D97706" />
                  </View>
                  <Text className="text-xs font-black text-ink">{comparisons.smartphoneCharges}</Text>
                  <Text className="text-[10px] text-muted text-center">Phone charges</Text>
                </View>
              </View>
            </View>

            {/* Next-Life Path Separation (Reuse vs Repair vs Recycle) */}
            <View className="bg-surface border border-border p-4 rounded-2xl mb-4">
              <Text className="text-xs font-extrabold text-ink uppercase tracking-wider mb-2">
                Next-Life Path Distribution
              </Text>
              <Text className="text-[11px] text-muted leading-4 mb-3">
                Reuse and repair avoid an order of magnitude more emissions than raw recycling.
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {byPath.map((p) => (
                  <View
                    key={p.path}
                    className="flex-row items-center gap-2 bg-background border border-border px-3 py-2 rounded-xl"
                  >
                    <View className="w-2 h-2 rounded-full bg-leaf" />
                    <Text className="text-xs font-bold text-ink">{p.path}</Text>
                    <Text className="text-xs font-extrabold text-leaf-dark">{p.massKg.toFixed(1)} kg</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text className="text-sm font-extrabold text-ink mb-2">Verified Ledger Entries ({records.length})</Text>
          </View>
        }
        ListEmptyComponent={
          <View className="bg-surface border border-border p-6 rounded-2xl items-center mb-6">
            <Ionicons name="receipt-outline" size={32} color={colors.muted} />
            <Text className="text-sm font-bold text-ink mt-2">No verified impact records yet</Text>
            <Text className="text-xs text-muted text-center mt-1 leading-4">
              Deposits and pickups verified through the Trust Gate will automatically appear on your impact ledger.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View className="mt-4 p-3.5 rounded-2xl bg-amber-soft border border-amber/30">
            <View className="flex-row items-start gap-2">
              <Ionicons name="information-circle-outline" size={18} color={colors.amber} />
              <View className="flex-1">
                <Text className="text-xs font-extrabold text-amber">Stated Methodology Basis</Text>
                <Text className="text-[11px] text-muted leading-4 mt-0.5">
                  {impact?.methodologyBasis ||
                    'Avoided emissions derived from ISO 14044 life cycle assessment emission factors with stated uncertainty ranges.'}
                </Text>
              </View>
            </View>
          </View>
        }
      />
    </StateView>
  );
}
