import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { categoryLabel, formatQuantityWithUnit } from '@/types';
import type { MyListing } from '@/hooks/useMyListings';

export interface ListingSelectorProps {
  listings: MyListing[];
  selectedListingId: string | null;
  onSelectListingId: (id: string) => void;
}

function listingSummaryLabel(listing: {
  category: string;
  unit: string;
  declared_weight?: string | number | null;
  piece_count?: number | null;
}): string {
  const quantity = listing.unit === 'piece' ? listing.piece_count : listing.declared_weight;
  return `${categoryLabel(listing.category)} · ${formatQuantityWithUnit(listing.unit, quantity)}`;
}

export const ListingSelector = React.memo(function ListingSelector({
  listings,
  selectedListingId,
  onSelectListingId,
}: ListingSelectorProps) {
  if (listings.length === 0) {
    return (
      <View className="bg-surface-muted border border-border rounded-sm p-[12px] mb-[14px]">
        <Text className="text-muted text-[13px]">
          No active listings available to dispatch. Create a listing first!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
    >
      {listings.map((item) => {
        const selected = selectedListingId === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            accessibilityLabel={listingSummaryLabel(item)}
            accessibilityState={{ checked: selected }}
            className={`min-h-[44px] px-[14px] rounded-pill border items-center justify-center active:opacity-[0.72] ${
              selected ? 'border-leaf bg-leaf-soft' : 'border-border bg-surface'
            }`}
            onPress={() => onSelectListingId(item.id)}
          >
            <Text
              className={`text-[13px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}
            >
              {listingSummaryLabel(item)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});
