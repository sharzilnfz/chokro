import React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { colors } from '@/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function Button({ label, onPress, loading = false, disabled = false, accessibilityLabel }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`min-h-[52px] rounded-[14px] bg-leaf items-center justify-center active:opacity-[0.75] ${isDisabled ? 'opacity-[0.55]' : ''}`}
      disabled={isDisabled}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={colors.surface} />
      ) : (
        <Text className="text-surface text-[16px] font-extrabold">{label}</Text>
      )}
    </Pressable>
  );
}
