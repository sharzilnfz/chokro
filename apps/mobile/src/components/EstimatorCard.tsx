import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { categoryLabel } from '@/types';
import type { Estimate } from '@/hooks/useEstimate';
import { CommodityDriftBadge } from '@/components/ratecard/CommodityDriftBadge';

export interface EstimatorCardProps {
  estimate: Estimate | null;
  isLoading: boolean;
  notFound?: boolean;
  hasQuantity?: boolean;
  quantityLabel?: string;
  category?: string;
  condition?: string;
  totalBdt?: number | null;
  className?: string;
}

export const EstimatorCard = React.memo(function EstimatorCard({
  estimate,
  isLoading,
  notFound,
  hasQuantity = false,
  quantityLabel = '',
  category = '',
  condition = '',
  totalBdt,
  className = '',
}: EstimatorCardProps) {
  if (isLoading) {
    return (
      <View
        className={`bg-surface border border-border rounded-md p-[16px] shadow-card min-h-[142px] items-center justify-center ${className}`}
        style={{ elevation: 2 }}
        accessibilityLabel="Calculating estimate"
      >
        <ActivityIndicator size="small" color={colors.leaf} />
        <Text className="text-muted text-[13px] font-bold mt-[8px]">Checking today&apos;s rate...</Text>
      </View>
    );
  }

  const isNotFound = notFound ?? (!isLoading && !estimate);

  if (isNotFound || !estimate) {
    if (!category && !condition) return null;
    return (
      <View
        className={`bg-surface border border-border rounded-md p-[16px] shadow-card ${className}`}
        style={{ elevation: 2 }}
        accessibilityLabel="No published rate yet"
      >
        <View className="flex-row items-center gap-[8px]">
          <Ionicons name="pulse-outline" size={17} color={colors.muted} />
          <Text className="text-ink text-[16px] font-extrabold">No published rate yet</Text>
        </View>
        <Text className="text-muted text-[13px] leading-[19px] mt-[6px]">
          {category && condition
            ? `There is no published ${categoryLabel(category)} rate for the ${categoryLabel(condition)} band right now. Try another condition — or check back once rates are next updated.`
            : 'There is no published rate available for this item right now.'}
        </Text>
      </View>
    );
  }

  const unitPrice = Number(estimate.price_bdt);
  const unit = estimate.unit;
  const unitWord = unit === 'kg' ? 'weight' : 'piece count';
  const total = hasQuantity
    ? (totalBdt !== undefined && totalBdt !== null
        ? totalBdt
        : (estimate.total_bdt !== undefined ? estimate.total_bdt : null))
    : null;
  const bigValue = total !== null ? total : unitPrice;

  return (
    <View
      className={`bg-surface border border-border rounded-md p-[16px] shadow-card ${className}`}
      style={{ elevation: 2 }}
      accessibilityLabel={
        total !== null
          ? `Estimated total ${bigValue.toFixed(2)} taka for ${quantityLabel}`
          : `Rate is ${unitPrice.toFixed(2)} taka per ${unit}`
      }
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-[6px]">
          <Ionicons name="pricetag" size={15} color={colors.leaf} />
          <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">ESTIMATED VALUE</Text>
        </View>
        <View className="bg-leaf-soft border border-leaf rounded-full px-[10px] py-[3px]">
          <Text className="text-leaf-dark text-[11px] font-bold">
            ৳{unitPrice.toFixed(2)}/{unit}
          </Text>
        </View>
      </View>

      <Text className="text-leaf text-[44px] leading-[50px] font-black tracking-tight mt-[8px]">
        ৳{bigValue.toFixed(2)}
        {total === null ? (
          <Text className="text-leaf-dark/60 text-[18px] font-bold">
            {' '}/{unit}
          </Text>
        ) : null}
      </Text>

      <Text className="text-muted text-[12px] font-medium leading-[16px] mt-[2px]" numberOfLines={1}>
        {total !== null && quantityLabel
          ? `${quantityLabel} × ৳${unitPrice.toFixed(2)}/${unit}`
          : `Enter the ${unitWord} above to calculate payout`}
      </Text>

      {estimate.market_benchmark ? (
        <View className="mt-[14px] pt-[12px] border-t border-border/60">
          <CommodityDriftBadge benchmark={estimate.market_benchmark} />
          <Text className="text-muted text-[11px] leading-[15px] mt-[6px]" numberOfLines={1}>
            Market benchmark ৳{estimate.market_benchmark.benchmark_bdt.toFixed(2)}/{unit} · Source:{' '}
            {estimate.market_benchmark.source}
          </Text>
        </View>
      ) : null}

      <Text className="text-muted text-[11px] leading-[15px] mt-[10px] pt-[6px] border-t border-border/60">
        Estimates use the currently published rate; final {unitWord} and value are confirmed at pickup.
      </Text>
    </View>
  );
});
