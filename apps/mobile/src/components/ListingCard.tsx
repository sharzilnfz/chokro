import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { categoryLabel, formatQuantityWithUnit, type Listing } from '@/types';

export interface ListingCardProps {
  item: Listing;
}

export const ListingCard = React.memo(function ListingCard({ item }: ListingCardProps) {
  const quantity = item.unit === 'piece'
    ? item.piece_count ?? item.declared_weight
    : item.declared_weight;
  const quantityText = formatQuantityWithUnit(item.unit, quantity);
  const photo = item.photos?.[0];

  return (
    <View
      className="bg-surface rounded-md border border-border overflow-hidden mt-[10px] shadow-card"
      style={{ elevation: 2 }}
      accessibilityLabel={`${categoryLabel(item.category)}, ${categoryLabel(item.declared_condition)}, ${quantityText}, status ${categoryLabel(item.status)}`}
    >
      {photo ? (
        <Image
          source={{ uri: photo }}
          className="w-full h-[178px] bg-surface-muted"
          contentFit="cover"
          transition={200}
          cachePolicy="disk"
          accessibilityLabel={`${categoryLabel(item.category)} listing photo`}
        />
      ) : (
        <View className="h-[130px] bg-surface-muted items-center justify-center gap-[5px]">
          <Ionicons name="image-outline" size={28} color={colors.muted} />
          <Text className="text-muted text-[12px] font-semibold">No photo available</Text>
        </View>
      )}
      <View className="p-[16px]">
        <View className="flex-row items-center justify-between gap-[10px]">
          <Text className="flex-1 text-ink text-[20px] font-extrabold tracking-tight">{categoryLabel(item.category)}</Text>
          <View className="min-h-[30px] flex-row items-center gap-[6px] bg-leaf-soft rounded-pill px-[10px]">
            <View className="w-[7px] h-[7px] rounded-[4px] bg-leaf" />
            <Text className="text-leaf-dark text-[11px] font-extrabold">{categoryLabel(item.status)}</Text>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-[14px] mt-[12px]">
          <View className="min-h-[28px] flex-row items-center gap-[6px]">
            <Ionicons name="layers-outline" size={16} color={colors.muted} />
            <Text className="text-muted text-[13px] font-bold">{quantityText}</Text>
          </View>
          <View className="min-h-[28px] flex-row items-center gap-[6px]">
            <Ionicons name="sparkles-outline" size={16} color={colors.muted} />
            <Text className="text-muted text-[13px] font-bold">{categoryLabel(item.declared_condition)}</Text>
          </View>
        </View>
        <Text className="text-muted text-[12px] leading-[18px] border-t border-border mt-[12px] pt-[11px]">
          Owner-declared details. Final condition and value are confirmed at handover.
        </Text>
      </View>
    </View>
  );
});

