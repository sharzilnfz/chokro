import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export const EwasteHazardBanner = React.memo(function EwasteHazardBanner() {
  return (
    <View
      accessibilityRole="alert"
      className="flex-row items-start gap-[10px] bg-danger-soft border border-danger rounded-md p-[13px] mt-[13px]"
    >
      <Ionicons name="warning" size={21} color={colors.danger} />
      <View className="flex-1">
        <Text className="text-danger text-[14px] font-extrabold">E-waste hazard</Text>
        <Text className="text-danger text-[12px] leading-[18px] font-semibold mt-[1px]">
          Routed to RECYCLE — cannot be overridden.
        </Text>
      </View>
    </View>
  );
});
