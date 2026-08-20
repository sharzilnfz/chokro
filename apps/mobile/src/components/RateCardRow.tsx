// Card grouping published rates for one category in the rate card screen.
// Third-party and app modules used to render the row.
import React from 'react';
import { Text, View } from 'react-native';
import { categoryLabel } from '@/types';
import type { RowRate } from '@/hooks/useRateCard';

// Props: the category-level rate group to display.
export interface RateCardRowProps {
  item: RowRate;
}

const DRIFT_DOT: Record<string, string> = {
  UNDER_MARKET: 'bg-amber',
  OVER_MARKET: 'bg-leaf',
  IN_SYNC: 'bg-border',
};

function driftLabel(status: string, pct?: number): string {
  if (status === 'IN_SYNC' || pct === undefined) return 'in sync';
  const sign = pct > 0 ? '+' : '\u2212';
  return `${sign}${Math.abs(pct)}% market`;
}

// Memoized per-category block listing each condition band's per-unit price.
export const RateCardRow = React.memo(function RateCardRow({ item }: RateCardRowProps) {
  return (
    <View
      className="bg-surface border border-border rounded-md p-[16px] mb-[14px] shadow-card"
      style={{ elevation: 2 }}
      accessibilityLabel={`${categoryLabel(item.category)} rates`}
    >
      <Text className="text-ink text-[16px] font-extrabold mb-[6px]">{categoryLabel(item.category)}</Text>
      {item.entries.map((rate) => (
        <View className="flex-row items-center py-[9px]" key={rate.id}>
          <Text className="text-ink text-[14px] font-bold">{categoryLabel(rate.condition_band)}</Text>
          <Text className="text-muted text-[12px] ml-[8px]">per {rate.unit}</Text>
          {rate.drift_status ? (
            <View className="flex-row items-center gap-[5px] ml-[10px]">
              <View className={`h-[8px] w-[8px] rounded-full ${DRIFT_DOT[rate.drift_status] ?? 'bg-border'}`} />
              <Text
                className={`text-[11px] font-bold ${rate.drift_status === 'IN_SYNC' ? 'text-muted' : rate.drift_status === 'UNDER_MARKET' ? 'text-amber' : 'text-leaf-dark'}`}
                numberOfLines={1}
              >
                {driftLabel(rate.drift_status, rate.drift_pct)}
              </Text>
            </View>
          ) : null}
          <Text className="text-leaf-dark text-[16px] font-extrabold ml-auto">৳ {Number(rate.price_bdt).toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );
});
