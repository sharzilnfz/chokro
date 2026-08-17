import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { AuctionBid } from '@/hooks/useAuctionLot';

export interface BidFeedRowProps {
  bid: AuctionBid;
  now: number;
  leading: boolean;
}

function formatBdtAmount(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

function formatRelativeTime(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const BidFeedRow = React.memo(function BidFeedRow({ bid, now, leading }: BidFeedRowProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      className={`flex-row items-center gap-[10px] border rounded-sm px-[10px] py-[9px] ${
        leading ? 'bg-leaf-soft border-leaf' : 'bg-surface-muted border-border'
      }`}
    >
      <View
        accessibilityElementsHidden
        className={`w-[28px] h-[28px] rounded-pill items-center justify-center ${
          leading ? 'bg-leaf' : 'bg-surface border border-border'
        }`}
      >
        <Text className={`text-[11px] font-extrabold ${leading ? 'text-surface' : 'text-muted'}`}>
          {bid.bid_number}
        </Text>
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-ink text-[13px] font-bold" numberOfLines={1}>
          {bid.bidder_org_name}
          {leading ? ' · leading' : ''}
        </Text>
        <Text className="text-muted text-[11px]">{formatRelativeTime(bid.received_at, now)}</Text>
      </View>
      <Text className="text-leaf-dark text-[15px] font-extrabold">
        ৳{formatBdtAmount(bid.amount_bdt)}
      </Text>
    </Animated.View>
  );
});
