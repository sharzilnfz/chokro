import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

const ANTI_SNIPE_WINDOW_MS = 2 * 60 * 1000;

export function formatCountdown(msLeft: number): string {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const CountdownChip = React.memo(function CountdownChip({
  closesAt,
  now,
  ended,
}: {
  closesAt: string;
  now: number;
  ended: boolean;
}) {
  if (ended) {
    return (
      <View className="flex-row items-center gap-[4px] bg-surface-muted border border-border rounded-pill px-[9px] py-[4px]">
        <Ionicons name="checkmark-done-outline" size={12} color={colors.muted} />
        <Text className="text-muted text-[11px] font-extrabold">Closed</Text>
      </View>
    );
  }
  const msLeft = new Date(closesAt).getTime() - now;
  const urgent = msLeft > 0 && msLeft < ANTI_SNIPE_WINDOW_MS;
  const label = formatCountdown(msLeft);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Closes in ${label}`}
      className={`flex-row items-center gap-[4px] rounded-pill px-[9px] py-[4px] border ${
        urgent ? 'bg-danger-soft border-danger' : 'bg-surface border-border'
      }`}
    >
      <Ionicons name="time-outline" size={12} color={urgent ? colors.danger : colors.leafDark} />
      <Text className={`text-[11px] font-extrabold ${urgent ? 'text-danger' : 'text-leaf-dark'}`}>
        {label}
      </Text>
    </View>
  );
});
