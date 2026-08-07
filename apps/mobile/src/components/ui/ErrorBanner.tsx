import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

type ErrorBannerProps = {
  message: string;
};

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <View accessibilityRole="alert" className="flex-row items-center gap-[8px] bg-danger-soft rounded-sm p-[12px] mb-[14px]">
      <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
      <Text className="flex-1 text-danger text-[14px] leading-[20px] font-semibold">{message}</Text>
    </View>
  );
}
