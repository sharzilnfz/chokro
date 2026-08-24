import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StateView } from '@/components/ui/StateView';
import { PickupCard } from '@/components/dispatch/PickupCard';
import type { PickupOrder } from '@/hooks/usePickups';

export interface CustomerPickupListProps {
  pickups: PickupOrder[];
  isLoading: boolean;
  onCancelPickup: (order: PickupOrder) => void;
  cancellingId?: string;
}

export const CustomerPickupList = React.memo(function CustomerPickupList({
  pickups,
  isLoading,
  onCancelPickup,
  cancellingId,
}: CustomerPickupListProps) {
  return (
    <View>
      <Text
        accessibilityRole="header"
        className="text-ink text-[19px] font-extrabold tracking-tight mb-[12px]"
      >
        My pickups
      </Text>
      {isLoading ? (
        <ActivityIndicator size="small" className="py-[16px]" />
      ) : pickups.length === 0 ? (
        <StateView
          isEmpty
          emptyIcon="navigate-outline"
          emptyTitle="No pickups yet"
          emptyMessage="Book your first pickup above — it only takes a few taps."
          containerClassName="border border-border rounded-md bg-surface"
        />
      ) : (
        <View className="gap-[12px]">
          {pickups.map((order) => (
            <PickupCard
              key={order.id}
              order={order}
              onCancel={onCancelPickup}
              cancelling={cancellingId === order.id}
            />
          ))}
        </View>
      )}
    </View>
  );
});
