import React from 'react';
import { Text, View } from 'react-native';
import { formatCountdown } from '@/components/auctions/CountdownChip';

export interface AntiSnipeCountdownProps {
  msLeft: number;
  totalMs: number;
  urgent: boolean;
}

export const AntiSnipeCountdown = React.memo(function AntiSnipeCountdown({
  msLeft,
  totalMs,
  urgent,
}: AntiSnipeCountdownProps) {
  const remainingFraction = totalMs > 0 ? Math.min(1, Math.max(0, msLeft / totalMs)) : 0;

  return (
    <View className="mt-[14px]">
      <View className="flex-row items-center justify-between mb-[7px]">
        <Text className="text-muted text-[11px] font-extrabold tracking-[0.8px]">CLOSES IN</Text>
        <Text
          accessibilityRole="text"
          className={`text-[15px] font-extrabold ${urgent ? 'text-danger' : 'text-ink'}`}
        >
          {formatCountdown(msLeft)}
        </Text>
      </View>
      <View className="h-[7px] rounded-pill bg-surface-muted border border-border overflow-hidden">
        <View
          className={`h-[7px] rounded-pill ${urgent ? 'bg-danger' : 'bg-leaf'}`}
          style={{ width: `${Math.round(remainingFraction * 100)}%` }}
        />
      </View>
      <Text
        className={`text-[11px] mt-[7px] leading-[16px] ${
          urgent ? 'text-danger font-bold' : 'text-muted'
        }`}
      >
        {urgent
          ? 'Anti-snipe window active: any new bid extends the clock by 2 minutes'
          : 'Final 2 minutes: new bids extend the close'}
      </Text>
    </View>
  );
});
