import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { formatQuantityWithUnit } from '@/types';
import type { Estimate } from '@/hooks/useEstimate';

export interface RateEstimateCardProps {
  estimate: Estimate | null;
  isLoading: boolean;
  parsedQuantity: number;
  totalEstimatedBdt: number | null;
}

export function RateEstimateCard({
  estimate,
  isLoading,
  parsedQuantity,
  totalEstimatedBdt,
}: RateEstimateCardProps) {
  if (isLoading) {
    return (
      <View
        className="bg-leaf-soft border border-leaf rounded-md p-[16px] mb-[13px] shadow-card min-h-[142px] justify-center items-center"
        style={{ elevation: 2 }}
      >
        <ActivityIndicator size="small" color={colors.leaf} />
        <Text className="text-leaf-dark text-[13px] font-bold mt-[6px]">Looking up current rate...</Text>
      </View>
    );
  }

  if (!estimate) return null;

  const unitLabel = estimate.unit === 'kg' ? 'weight' : 'quantity';
  const quantityText = formatQuantityWithUnit(estimate.unit, parsedQuantity);

  return (
    <View className="bg-leaf-soft border border-leaf rounded-md p-[16px] mb-[13px] shadow-card min-h-[142px]" style={{ elevation: 2 }}>
      <View className="flex-row items-center justify-between mb-[4px]">
        <View className="flex-row items-center gap-[8px]">
          <Ionicons name="pricetag" size={17} color={colors.leaf} />
          <Text className="text-leaf-dark text-[16px] font-extrabold">Estimated value</Text>
        </View>
        <View className="bg-surface border border-border rounded-full px-[8px] py-[2px]">
          <Text className="text-leaf-dark text-[11px] font-bold">
            ৳{Number(estimate.price_bdt).toFixed(2)}/{estimate.unit}
          </Text>
        </View>
      </View>

      <Text className="text-ink text-[28px] font-black tracking-tight leading-[34px]">
        ৳{totalEstimatedBdt !== null ? totalEstimatedBdt.toFixed(2) : '0.00'}
      </Text>

      <Text className="text-muted text-[12px] font-medium leading-[16px] mt-[1px]" numberOfLines={1}>
        {totalEstimatedBdt !== null
          ? `${quantityText} × ৳${Number(estimate.price_bdt).toFixed(2)}/${estimate.unit}`
          : `Enter ${unitLabel} above to calculate payout`}
      </Text>

      <Text className="text-muted text-[11px] leading-[15px] mt-[8px] pt-[6px] border-t border-border/60" numberOfLines={1}>
        Final {unitLabel} and value confirmed at pickup.
      </Text>
    </View>
  );
}
