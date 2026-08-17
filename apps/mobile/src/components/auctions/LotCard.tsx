import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { categoryLabel } from '@/types';
import type { AuctionLot } from '@/hooks/useAuctionLots';
import { AuctionCategoryBadge } from '@/components/auctions/AuctionCategoryBadge';
import { CountdownChip } from '@/components/auctions/CountdownChip';
import { ReserveBadge } from '@/components/auctions/ReserveBadge';

export { AuctionCategoryBadge as CategoryBadge, CountdownChip, ReserveBadge };

export interface LotCardProps {
  lot: AuctionLot;
  now: number;
  onOpen: (lot: AuctionLot) => void;
}

function formatBdtAmount(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

export const LotCard = React.memo(function LotCard({ lot, now, onOpen }: LotCardProps) {
  const ended = lot.status !== 'LIVE';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${lot.title}, ${categoryLabel(lot.category)}, ${lot.quantity_kg} kg, current bid ${formatBdtAmount(
        lot.current_price_bdt,
      )} taka`}
      className="bg-surface border border-border rounded-md p-[16px] shadow-card active:opacity-[0.72]"
      style={{ elevation: 2 }}
      onPress={() => onOpen(lot)}
    >
      <View className="flex-row items-start gap-[12px]">
        <AuctionCategoryBadge category={lot.category} />
        <View className="flex-1 min-w-0">
          {ended ? (
            <View className="flex-row items-center gap-[6px] mb-[6px]">
              <View className="bg-surface-muted border border-border rounded-pill px-[9px] py-[3px]">
                <Text className="text-muted text-[11px] font-extrabold tracking-[0.6px]">ENDED</Text>
              </View>
              <Text className="text-muted text-[11px] font-bold" numberOfLines={1}>
                {lot.winning_bid_id ? 'Sold' : 'No sale'}
              </Text>
            </View>
          ) : null}
          <Text className="text-ink text-[15px] font-bold leading-[20px]" numberOfLines={2}>
            {lot.title}
          </Text>
          <Text className="text-muted text-[12px] mt-[3px]" numberOfLines={1}>
            {categoryLabel(lot.category)} · {formatBdtAmount(lot.quantity_kg)} kg
            {lot.origin_label ? ` · ${lot.origin_label}` : ''}
          </Text>
          <View className="mt-[9px]">
            <Text className="text-muted text-[10px] font-extrabold tracking-[0.8px]">
              {lot.bid_count > 0 ? 'CURRENT BID' : 'STARTING PRICE'}
            </Text>
            <Text className="text-ink text-[22px] leading-[27px] font-extrabold tracking-tight">
              ৳{formatBdtAmount(lot.current_price_bdt)}
            </Text>
          </View>
        </View>
        <View className="items-end gap-[6px]">
          <CountdownChip closesAt={lot.closes_at} now={now} ended={ended} />
          <View className="flex-row items-center gap-[4px] bg-surface-muted border border-border rounded-pill px-[9px] py-[4px]">
            <Ionicons name="hammer-outline" size={12} color={colors.leafDark} />
            <Text className="text-leaf-dark text-[11px] font-extrabold">{lot.bid_count}</Text>
          </View>
          <ReserveBadge reserveMet={lot.reserve_met} />
        </View>
      </View>
    </Pressable>
  );
});
