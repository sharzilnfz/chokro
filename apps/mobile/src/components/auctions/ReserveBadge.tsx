import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export const ReserveBadge = React.memo(function ReserveBadge({
  reserveMet,
}: {
  reserveMet: boolean;
}) {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={reserveMet ? 'Reserve met' : 'Reserve not met'}
      className={`flex-row items-center gap-[4px] rounded-pill px-[9px] py-[4px] ${
        reserveMet ? 'bg-leaf-soft' : 'bg-surface-muted'
      }`}
    >
      <Ionicons
        name={reserveMet ? 'lock-open-outline' : 'lock-closed-outline'}
        size={12}
        color={reserveMet ? colors.leafDark : colors.muted}
      />
      <Text className={`text-[11px] font-bold ${reserveMet ? 'text-leaf-dark' : 'text-muted'}`}>
        {reserveMet ? 'Reserve met' : 'Reserve not met'}
      </Text>
    </View>
  );
});
