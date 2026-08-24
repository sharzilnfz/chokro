import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { MarketBenchmark } from '@/hooks/useEstimate';

export interface CommodityDriftBadgeProps {
  benchmark: MarketBenchmark;
}

function formatPct(pct: number): string {
  return String(Math.abs(Math.round(pct * 10) / 10));
}

export const CommodityDriftBadge = React.memo(function CommodityDriftBadge({
  benchmark,
}: CommodityDriftBadgeProps) {
  const status = benchmark.drift_status;

  if (status === 'IN_SYNC') {
    return (
      <View
        className="flex-row items-center gap-[8px] bg-surface-muted border border-border rounded-pill px-[12px] py-[8px] self-start"
        accessibilityRole="text"
        accessibilityLabel="Rate is in sync with market"
      >
        <Ionicons name="checkmark-circle-outline" size={16} color={colors.muted} />
        <Text className="text-muted text-[12px] font-extrabold">In sync with market</Text>
      </View>
    );
  }

  if (status === 'UNDER_MARKET') {
    return (
      <View
        className="flex-row items-center gap-[8px] bg-amber-soft border border-amber rounded-pill px-[12px] py-[8px] self-start"
        accessibilityRole="alert"
        accessibilityLabel={`Your rate is ${formatPct(benchmark.drift_pct)} percent under market`}
      >
        <Ionicons name="trending-down" size={16} color={colors.amber} />
        <Text className="text-amber text-[12px] font-extrabold">
          Your rate is {formatPct(benchmark.drift_pct)}% under market
        </Text>
      </View>
    );
  }

  return (
    <View
      className="flex-row items-center gap-[8px] bg-leaf-soft border border-leaf rounded-pill px-[12px] py-[8px] self-start"
      accessibilityRole="text"
      accessibilityLabel={`Rate is ${formatPct(benchmark.drift_pct)} percent over market`}
    >
      <Ionicons name="trending-up" size={16} color={colors.leaf} />
      <Text className="text-leaf-dark text-[12px] font-extrabold">
        {formatPct(benchmark.drift_pct)}% over market
      </Text>
    </View>
  );
});
