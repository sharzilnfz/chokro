import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { Unit } from '@/types';

export interface QuantityInputBoxProps {
  unit: Unit;
  weightText: string;
  onChangeWeightText: (text: string) => void;
  pieceCount: number;
  onAdjustPieceCount: (delta: number) => void;
}

const STEP_AMOUNTS = [1, 5, 10, 25];

export const QuantityInputBox = React.memo(function QuantityInputBox({
  unit,
  weightText,
  onChangeWeightText,
  pieceCount,
  onAdjustPieceCount,
}: QuantityInputBoxProps) {
  return (
    <View
      className="bg-surface border border-border rounded-md p-[16px] shadow-card"
      style={{ elevation: 2 }}
    >
      <Text className="text-ink text-[12px] font-extrabold mb-[8px]">
        {unit === 'kg' ? 'Estimated weight (kg)' : 'Piece count'}
      </Text>

      {unit === 'kg' ? (
        <View>
          <View className="flex-row items-center border border-border rounded-sm bg-background min-h-[50px] px-[14px]">
            <TextInput
              className="flex-1 text-ink text-[16px] font-bold min-w-0"
              placeholder="e.g. 5.5"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={weightText}
              onChangeText={onChangeWeightText}
              accessibilityLabel="Estimated weight in kilograms"
            />
            <Text className="text-muted text-[13px] font-bold ml-[8px]">kg</Text>
          </View>
          <View className="flex-row gap-[8px] mt-[10px]">
            {STEP_AMOUNTS.map((step) => (
              <Pressable
                key={step}
                accessibilityRole="button"
                accessibilityLabel={`Add ${step} kg`}
                className="flex-1 min-h-[38px] rounded-pill border border-border bg-surface items-center justify-center active:opacity-[0.72]"
                onPress={() =>
                  onChangeWeightText(String((parseFloat(weightText) || 0) + step))
                }
              >
                <Text className="text-leaf-dark text-[12px] font-extrabold">+{step}kg</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View className="flex-row items-center border border-border rounded-sm bg-background min-h-[52px]">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease piece count"
            className="w-[48px] h-[52px] items-center justify-center active:opacity-[0.72]"
            onPress={() => onAdjustPieceCount(-1)}
          >
            <Ionicons name="remove" size={18} color={colors.muted} />
          </Pressable>
          <Text className="flex-1 text-center text-ink text-[17px] font-extrabold">
            {pieceCount} {pieceCount === 1 ? 'piece' : 'pieces'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase piece count"
            className="w-[48px] h-[52px] items-center justify-center active:opacity-[0.72]"
            onPress={() => onAdjustPieceCount(1)}
          >
            <Ionicons name="add" size={18} color={colors.muted} />
          </Pressable>
        </View>
      )}
    </View>
  );
});
