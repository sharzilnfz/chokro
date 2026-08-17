import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export interface AuctionOutcomeBannerProps {
  outcome: {
    sold: boolean;
    winner_org_name?: string;
    final_price_bdt?: number;
    reason?: string;
  };
}

function formatBdtAmount(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

export const AuctionOutcomeBanner = React.memo(function AuctionOutcomeBanner({
  outcome,
}: AuctionOutcomeBannerProps) {
  return (
    <Animated.View
      entering={FadeInUp.duration(450)}
      className="bg-surface border border-border rounded-md p-[16px] shadow-card mb-[14px]"
      style={{ elevation: 2 }}
      accessibilityLiveRegion="polite"
    >
      <View className="flex-row items-center gap-[10px] mb-[8px]">
        <Ionicons
          name={outcome.sold ? 'trophy-outline' : 'lock-closed-outline'}
          size={22}
          color={outcome.sold ? colors.amber : colors.muted}
        />
        <Text className="text-ink text-[17px] font-extrabold tracking-tight">
          {outcome.sold ? 'Lot sold' : 'No sale'}
        </Text>
      </View>
      {outcome.sold ? (
        <>
          <Text className="text-ink text-[14px] font-bold">
            {outcome.winner_org_name} won this lot
          </Text>
          <Text className="text-muted text-[13px] mt-[3px]">
            Final price ৳{formatBdtAmount(outcome.final_price_bdt ?? 0)} · the highest bid cleared
            the sealed reserve.
          </Text>
        </>
      ) : (
        <Text className="text-muted text-[13px] leading-[19px]">
          {outcome.reason ?? 'Reserve not met'}
        </Text>
      )}
    </Animated.View>
  );
});
