import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { categoryLabel, formatQuantityWithUnit } from '@/types';
import type { PickupOrder, PickupStatus } from '@/hooks/usePickups';
import { HandoverOtpModal } from '@/components/HandoverOtpModal';

export interface PickupCardProps {
  order: PickupOrder;
  onCancel: (order: PickupOrder) => void;
  cancelling: boolean;
}

const STATUS_PILLS: Record<PickupStatus, { label: string; className: string }> = {
  REQUESTED: { label: 'Requested', className: 'bg-amber-soft text-amber' },
  ASSIGNED: { label: 'Assigned', className: 'bg-leaf-soft text-leaf-dark' },
  EN_ROUTE: { label: 'En route', className: 'bg-leaf text-surface' },
  COLLECTED: { label: 'Collected', className: 'bg-surface-muted text-muted' },
  CANCELLED: { label: 'Cancelled', className: 'bg-danger-soft text-danger' },
};

function StatusPill({ status }: { status: PickupStatus }) {
  const pill = STATUS_PILLS[status] ?? STATUS_PILLS.REQUESTED;
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Status: ${pill.label}`}
      className={`self-start px-[10px] py-[3px] rounded-pill ${pill.className}`}
    >
      <Text className="text-[11px] font-extrabold tracking-[0.4px]">{pill.label}</Text>
    </View>
  );
}

function formatSchedule(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function listingSummaryLabel(listing: {
  category: string;
  unit: string;
  declared_weight?: string | number | null;
  piece_count?: number | null;
}): string {
  const quantity = listing.unit === 'piece' ? listing.piece_count : listing.declared_weight;
  return `${categoryLabel(listing.category)} · ${formatQuantityWithUnit(listing.unit, quantity)}`;
}

export const PickupCard = React.memo(function PickupCard({
  order,
  onCancel,
  cancelling,
}: PickupCardProps) {
  const [showOtpModal, setShowOtpModal] = useState(false);
  const isCancellable = order.status === 'REQUESTED' || order.status === 'ASSIGNED';
  const hasHandoverCode = order.status === 'ASSIGNED' || order.status === 'EN_ROUTE';

  return (
    <View
      className="bg-surface border border-border rounded-md p-[16px] shadow-card"
      style={{ elevation: 2 }}
      accessibilityLabel={`Pickup order for ${order.listing.category}, status ${order.status}`}
    >
      <View className="flex-row items-center justify-between gap-[10px] mb-[8px]">
        <StatusPill status={order.status} />
        <Text className="text-muted text-[12px] font-bold">
          {formatSchedule(order.scheduled_for)}
        </Text>
      </View>

      <Text className="text-ink text-[16px] font-extrabold">
        {listingSummaryLabel({
          category: order.listing.category,
          unit: order.listing.unit,
          declared_weight: order.listing.declared_weight,
          piece_count: order.listing.piece_count,
        })}
      </Text>

      <Text className="text-muted text-[13px] mt-[4px]" numberOfLines={2}>
        {order.address}
      </Text>

      {order.collector ? (
        <View className="flex-row items-center gap-[6px] mt-[10px] pt-[8px] border-t border-border">
          <Ionicons name="car-outline" size={16} color={colors.leafDark} />
          <Text className="text-ink text-[13px] font-bold">
            Assigned: {order.collector.org_name}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center justify-end gap-[8px] mt-[12px]">
        {hasHandoverCode && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show custody handover OTP challenge code"
            className="px-[12px] py-[6px] rounded-pill bg-leaf flex-row items-center gap-[4px] active:opacity-[0.72]"
            onPress={() => setShowOtpModal(true)}
          >
            <Ionicons name="keypad" size={13} color={colors.surface} />
            <Text className="text-surface text-[12px] font-extrabold">Handover Code</Text>
          </Pressable>
        )}

        {isCancellable && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel this pickup"
            accessibilityState={{ disabled: cancelling }}
            disabled={cancelling}
            className="px-[12px] py-[6px] rounded-pill border border-border bg-surface-muted active:opacity-[0.72]"
            onPress={() => onCancel(order)}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Text className="text-danger text-[12px] font-bold">Cancel</Text>
            )}
          </Pressable>
        )}
      </View>

      <HandoverOtpModal
        visible={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        taskId={order.id}
        mode="GIVER"
        listingCategory={order.listing.category}
        declaredQuantity={order.listing.declared_weight || order.listing.piece_count}
        unit={order.listing.unit}
      />
    </View>
  );
});
