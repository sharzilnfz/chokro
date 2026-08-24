import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { Category } from '@/types';

const CATEGORY_STYLE: Record<Category, { icon: keyof typeof Ionicons.glyphMap; tint: string }> = {
  CLOTHES: { icon: 'shirt-outline', tint: colors.leaf },
  BOOKS: { icon: 'book-outline', tint: colors.amber },
  PLASTICS: { icon: 'water-outline', tint: colors.leaf },
  PAPER: { icon: 'newspaper-outline', tint: colors.muted },
  METAL: { icon: 'cube-outline', tint: colors.leafDark },
  GLASS: { icon: 'wine-outline', tint: colors.leaf },
  FURNITURE: { icon: 'bed-outline', tint: colors.amber },
  APPLIANCES: { icon: 'flash-outline', tint: colors.amber },
  E_WASTE: { icon: 'warning-outline', tint: colors.danger },
};

export function getCategoryStyle(category: string) {
  return CATEGORY_STYLE[category as Category] ?? { icon: 'leaf-outline' as const, tint: colors.leaf };
}

export const AuctionCategoryBadge = React.memo(function AuctionCategoryBadge({
  category,
}: {
  category: string;
}) {
  const style = getCategoryStyle(category);
  return (
    <View
      accessibilityElementsHidden
      className="w-[40px] h-[40px] rounded-[12px] bg-surface-muted border border-border items-center justify-center"
    >
      <Ionicons name={style.icon} size={20} color={style.tint} />
    </View>
  );
});
