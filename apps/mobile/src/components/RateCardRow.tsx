import React from 'react';
import { Text, View } from 'react-native';
import { categoryLabel, type RowRate } from '@/types';

export interface RateCardRowProps {
  item: RowRate;
}

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
          <Text className="text-leaf-dark text-[16px] font-extrabold ml-auto">৳ {Number(rate.price_bdt).toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );
});
