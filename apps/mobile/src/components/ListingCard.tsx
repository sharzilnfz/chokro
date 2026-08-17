import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { categoryLabel, formatQuantityWithUnit } from '@/types';
import type { Listing } from '@/hooks/useFeed';

export interface ListingCardProps {
  item: Listing;
  onContactSeller?: () => void;
  onToggleSaved?: () => void;
  saving?: boolean;
}

export function ListingCard({ item, onContactSeller, onToggleSaved, saving }: ListingCardProps) {
  const quantity = item.unit === 'piece'
    ? item.piece_count ?? item.declared_weight
    : item.declared_weight;
  const quantityText = formatQuantityWithUnit(item.unit, quantity);
  const photo = item.photos?.[0];
  const priceText = item.price_bdt != null && item.price_bdt !== '' ? `৳${Number(item.price_bdt).toFixed(2)}` : null;
  const saved = Boolean(item.saved);

  return (
    <View
      className="bg-surface rounded-md border border-border overflow-hidden mt-[10px] shadow-card"
      style={{ elevation: 2 }}
      accessibilityLabel={`${categoryLabel(item.category)}, ${categoryLabel(item.declared_condition)}, ${quantityText}, status ${categoryLabel(item.status)}, ${saved ? 'saved' : 'not saved'}`}
    >
      <View>
        {photo ? (
          <Image
            source={{ uri: photo }}
            className="w-full h-[178px] bg-surface-muted"
            resizeMode="cover"
            accessibilityLabel={`${categoryLabel(item.category)} listing photo`}
          />
        ) : (
          <View className="h-[130px] bg-surface-muted items-center justify-center gap-[5px]">
            <Ionicons name="image-outline" size={28} color={colors.muted} />
            <Text className="text-muted text-[12px] font-semibold">No photo available</Text>
          </View>
        )}
        {onToggleSaved ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Unsave listing' : 'Save listing'}
            accessibilityState={{ selected: saved, disabled: saving, busy: saving }}
            disabled={saving}
            hitSlop={8}
            className="absolute top-[12px] right-[12px] w-11 h-11 rounded-full items-center justify-center active:opacity-[0.72]"
            style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}
            onPress={onToggleSaved}
          >
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={21}
              color={saved ? colors.leafDark : colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
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
        {priceText ? (
          <Text className="text-ink text-[24px] font-black tracking-tight mt-[10px]">{priceText}</Text>
        ) : null}
        <View className="flex-row items-center gap-[6px] mt-[12px]">
          <Ionicons name="person-outline" size={15} color={colors.muted} />
          <Text className="text-muted text-[13px] font-bold flex-1" numberOfLines={1}>
            {item.seller_email ?? 'Seller'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Contact seller"
          className="min-h-[46px] rounded-[12px] bg-leaf items-center justify-center mt-[14px] active:opacity-[0.72]"
          onPress={onContactSeller}
        >
          <View className="flex-row items-center gap-[7px]">
            <Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.surface} />
            <Text className="text-surface text-[15px] font-extrabold">Contact seller</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
