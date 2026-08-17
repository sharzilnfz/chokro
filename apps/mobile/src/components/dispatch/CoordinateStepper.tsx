import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export interface CoordinateStepperProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  stepAmount?: number;
}

export const CoordinateStepper = React.memo(function CoordinateStepper({
  label,
  value,
  onChange,
  stepAmount = 0.005,
}: CoordinateStepperProps) {
  const step = (delta: number) => {
    const base = Number.parseFloat(value);
    const next = (Number.isFinite(base) ? base : 0) + delta;
    onChange(next.toFixed(4));
  };

  return (
    <View className="flex-1">
      <Text className="text-ink text-[12px] font-extrabold mb-[7px]">{label}</Text>
      <View className="flex-row items-center border border-border rounded-sm bg-surface min-h-[52px]">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          className="w-[44px] h-[52px] items-center justify-center active:opacity-[0.72]"
          onPress={() => step(-stepAmount)}
        >
          <Ionicons name="remove" size={16} color={colors.muted} />
        </Pressable>
        <TextInput
          className="flex-1 text-ink text-[15px] font-bold text-center min-w-0"
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          accessibilityLabel={label}
          accessibilityHint={`Adjust in steps of ${stepAmount}`}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          className="w-[44px] h-[52px] items-center justify-center active:opacity-[0.72]"
          onPress={() => step(stepAmount)}
        >
          <Ionicons name="add" size={16} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
});
