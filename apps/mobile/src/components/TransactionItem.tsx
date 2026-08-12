import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { categoryLabel } from '@/types';
import type { CreditTransaction } from '@/hooks/useWallet';

export interface TransactionItemProps {
  item: CreditTransaction;
}

export const TransactionItem = React.memo(function TransactionItem({ item }: TransactionItemProps) {
  const amount = Number(item.amount ?? 0);
  const isDebit = amount < 0;
  const sign = isDebit ? '-' : '+';
  const statusColor = item.status === 'VERIFIED' ? colors.leafDark : item.status === 'PENDING' ? colors.amber : colors.danger;

  return (
    <View
      className="min-h-[78px] flex-row items-center bg-surface border border-border rounded-md p-[13px] mb-[9px] shadow-card"
      style={{ elevation: 2 }}
      accessibilityLabel={`${categoryLabel(item.kind)} ${Math.abs(amount).toFixed(2)} credits, ${categoryLabel(item.status)}`}
    >
      <View className={`w-[44px] h-[44px] rounded-[14px] items-center justify-center ${isDebit ? 'bg-danger-soft' : 'bg-leaf-soft'}`}>
        <Ionicons name={isDebit ? 'arrow-up' : 'arrow-down'} size={19} color={isDebit ? colors.danger : colors.leafDark} />
      </View>
      <View className="flex-1 mx-[11px]">
        <Text className="text-ink text-[14px] font-extrabold">{categoryLabel(item.kind)}</Text>
        <Text className="text-[11px] font-extrabold mt-[2px]" style={{ color: statusColor }}>{categoryLabel(item.status)}</Text>
        {item.reason ? <Text className="text-muted text-[11px] leading-[16px] mt-[2px]">{item.reason}</Text> : null}
      </View>
      <Text className={`text-[16px] font-extrabold ${isDebit ? 'text-danger' : 'text-leaf-dark'}`}>{sign}{Math.abs(amount).toFixed(2)}</Text>
    </View>
  );
});
