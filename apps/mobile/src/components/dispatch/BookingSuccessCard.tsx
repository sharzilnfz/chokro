import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { BookPickupResult } from '@/hooks/usePickups';

export interface BookingSuccessCardProps {
  result: BookPickupResult;
}

export const BookingSuccessCard = React.memo(function BookingSuccessCard({
  result,
}: BookingSuccessCardProps) {
  const assigned = result.assignment_status === 'ASSIGNED' && result.collector != null;

  return (
    <Animated.View
      entering={FadeInUp.duration(450)}
      className="bg-surface border border-border rounded-md p-[16px] shadow-card mb-[18px]"
      style={{ elevation: 2 }}
      accessibilityLiveRegion="polite"
    >
      <View className="flex-row items-center gap-[10px] mb-[10px]">
        <Ionicons
          name={assigned ? 'checkmark-circle' : 'time'}
          size={22}
          color={assigned ? colors.leaf : colors.amber}
        />
        <Text className="text-ink text-[17px] font-extrabold tracking-tight">
          {assigned ? 'Collector assigned' : 'Pickup queued'}
        </Text>
      </View>

      {assigned ? (
        <>
          <Text className="text-ink text-[14px] font-bold">
            {result.collector?.partner.org_name} is scheduled to collect this item.
          </Text>
          <Text className="text-muted text-[13px] mt-[4px]">
            {result.collector?.distance_km} km away · Vehicle remaining capacity:{' '}
            {result.collector?.remaining_capacity_kg ? `${result.collector.remaining_capacity_kg} kg` : 'Open'}
          </Text>
        </>
      ) : (
        <Text className="text-muted text-[13px] leading-[19px]">
          No collector had open vehicle capacity within your area right now. We will assign the next
          collector who enters your radius.
        </Text>
      )}
    </Animated.View>
  );
});
