// Inline alert banner for surfacing errors at the top of a screen or form.
// Third-party and app modules used to render the banner.
import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

// Props: the error text to display.
type ErrorBannerProps = {
  message: string;
};

// Renders a dismissible-free alert row with icon and message.
export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <View accessibilityRole="alert" className="flex-row items-center gap-[8px] bg-danger-soft rounded-sm p-[12px] mb-[14px]">
      <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
      <Text className="flex-1 text-danger text-[14px] leading-[20px] font-semibold">{message}</Text>
    </View>
  );
}
