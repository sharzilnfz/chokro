import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { ReserveBadge } from '@/components/auctions/ReserveBadge';
import type { AuctionBid } from '@/hooks/useAuctionLot';
import type { AuctionLot } from '@/hooks/useAuctionLots';

export interface LivePriceTickerProps {
  lot: AuctionLot;
  leadingBid: AuctionBid | null;
}

function formatBdtAmount(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

export const LivePriceTicker = React.memo(function LivePriceTicker({
  lot,
  leadingBid,
}: LivePriceTickerProps) {
  return (
    <View
      className="flex-row items-end justify-between mt-[16px] pt-[14px] border-t border-border"
      accessibilityLabel={`Current price ${formatBdtAmount(lot.current_price_bdt)} taka`}
    >
      <View>
        <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">
          {lot.bid_count > 0 ? 'CURRENT PRICE' : 'STARTING PRICE'}
        </Text>
        <Animated.Text
          key={`price-${lot.current_price_bdt}`}
          entering={FadeInUp.duration(350)}
          className="text-ink text-[36px] leading-[42px] font-extrabold tracking-tight"
        >
          ৳{formatBdtAmount(lot.current_price_bdt)}
        </Animated.Text>
        {leadingBid ? (
          <Text className="text-muted text-[12px] mt-[2px]" numberOfLines={1}>
            Top bid #{leadingBid.bid_number} by {leadingBid.bidder_org_name}
          </Text>
        ) : (
          <Text className="text-muted text-[12px] mt-[2px]">No bids yet — open the floor</Text>
        )}
      </View>
      <View className="items-end gap-[6px]">
        <ReserveBadge reserveMet={lot.reserve_met} />
        <View className="flex-row items-center gap-[4px] bg-surface-muted border border-border rounded-pill px-[9px] py-[4px]">
          <Ionicons name="hammer-outline" size={12} color={colors.leafDark} />
          <Text className="text-leaf-dark text-[11px] font-extrabold">{lot.bid_count} bids</Text>
        </View>
      </View>
    </View>
  );
});
