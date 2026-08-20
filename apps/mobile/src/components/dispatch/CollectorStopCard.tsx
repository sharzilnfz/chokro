import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { categoryLabel, formatQuantityWithUnit } from '@/types';
import type { RouteStop } from '@/hooks/useCollectorRoute';
import type { PickupStatus } from '@/hooks/usePickups';
import { HandoverOtpModal } from '@/components/HandoverOtpModal';

export interface CollectorStopCardProps {
  stop: RouteStop;
  onAdvance: (stop: RouteStop, nextStatus: PickupStatus) => void;
  advancing: boolean;
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

export const CollectorStopCard = React.memo(function CollectorStopCard({
  stop,
  onAdvance,
  advancing,
}: CollectorStopCardProps) {
  const [showOtpModal, setShowOtpModal] = useState(false);

  return (
    <Animated.View
      entering={FadeInUp.duration(350).delay(Math.min(stop.stop_sequence, 8) * 60)}
      className="bg-surface border border-border rounded-md p-[16px] shadow-card"
      style={{ elevation: 2 }}
    >
      <View className="flex-row items-start gap-[12px]">
        <View
          className="w-[30px] h-[30px] rounded-pill bg-leaf items-center justify-center"
          accessibilityElementsHidden
        >
          <Text className="text-surface text-[13px] font-extrabold">{stop.stop_sequence}</Text>
        </View>
        <View className="flex-1">
          <StatusPill status={stop.status} />
          <Text className="text-ink text-[15px] font-bold mt-[7px]" numberOfLines={2}>
            {stop.address}
          </Text>
          <Text className="text-muted text-[12px] mt-[3px]">
            {listingSummaryLabel({
              category: stop.listing.category,
              unit: stop.listing.unit,
              declared_weight: stop.listing.declared_weight,
              piece_count: stop.listing.piece_count,
            })}{' '}
            · {formatSchedule(stop.scheduled_for)}
          </Text>
          {stop.notes ? (
            <Text className="text-muted text-[12px] italic mt-[3px]" numberOfLines={1}>
              &ldquo;{stop.notes}&rdquo;
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-[8px] mt-[9px]">
            <View className="flex-row items-center gap-[4px] bg-surface-muted border border-border rounded-pill px-[10px] py-[3px]">
              <Ionicons name="resize-outline" size={12} color={colors.leafDark} />
              <Text className="text-leaf-dark text-[11px] font-bold">
                +{stop.distance_from_previous_km} km leg
              </Text>
            </View>
            <View className="flex-row items-center gap-[4px] bg-surface-muted border border-border rounded-pill px-[10px] py-[3px]">
              <Ionicons name="time-outline" size={12} color={colors.leafDark} />
              <Text className="text-leaf-dark text-[11px] font-bold">
                ETA {stop.cumulative_eta_minutes} min
              </Text>
            </View>
          </View>

          {stop.status === 'ASSIGNED' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Start route to ${stop.address}`}
              accessibilityState={{ disabled: advancing }}
              disabled={advancing}
              className="min-h-[44px] rounded-sm items-center justify-center mt-[12px] active:opacity-[0.72] bg-leaf flex-row gap-[6px]"
              onPress={() => onAdvance(stop, 'EN_ROUTE')}
            >
              {advancing ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <>
                  <Ionicons name="navigate" size={15} color={colors.surface} />
                  <Text className="text-surface text-[13px] font-extrabold">Start route</Text>
                </>
              )}
            </Pressable>
          ) : stop.status === 'EN_ROUTE' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Verify handover at ${stop.address}`}
              className="min-h-[44px] rounded-sm items-center justify-center mt-[12px] active:opacity-[0.72] bg-leaf flex-row gap-[6px]"
              onPress={() => setShowOtpModal(true)}
            >
              <Ionicons name="keypad" size={15} color={colors.surface} />
              <Text className="text-surface text-[13px] font-extrabold">
                Verify Handover (OTP)
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <HandoverOtpModal
        visible={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        taskId={stop.order_id}
        mode="COLLECTOR"
        listingCategory={stop.listing.category}
        declaredQuantity={stop.listing.declared_weight || stop.listing.piece_count}
        unit={stop.listing.unit}
      />
    </Animated.View>
  );
});
