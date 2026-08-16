import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { categoryLabel, formatQuantityWithUnit } from '@/types';
import { StateView } from '@/components/ui/StateView';
import { isCollectorPartner, usePartnerMe, type PartnerProfile } from '@/hooks/usePartnerMe';
import {
  useBookPickup,
  usePickups,
  useUpdatePickupStatus,
  type BookPickupResult,
  type CollectorEvaluation,
  type PickupOrder,
  type PickupStatus,
} from '@/hooks/usePickups';
import { useCollectorRoute, type RouteStop } from '@/hooks/useCollectorRoute';
import { useMyListings, type MyListing } from '@/hooks/useMyListings';

const DHAKA_DEMO = { lat: '23.7806', lng: '90.4192' };
const COORD_STEP = 0.005;

const SCHEDULE_PRESETS = [
  { key: 'today-evening', label: 'Today 4–6pm', dayOffset: 0, hour: 16 },
  { key: 'tomorrow-morning', label: 'Tomorrow 9–11am', dayOffset: 1, hour: 9 },
  { key: 'tomorrow-afternoon', label: 'Tomorrow 2–4pm', dayOffset: 1, hour: 14 },
] as const;

type SchedulePreset = (typeof SCHEDULE_PRESETS)[number]['key'];

function presetToDate(key: SchedulePreset): Date {
  const preset = SCHEDULE_PRESETS.find((item) => item.key === key) ?? SCHEDULE_PRESETS[0];
  const date = new Date();
  date.setDate(date.getDate() + preset.dayOffset);
  date.setHours(preset.hour, 0, 0, 0);
  return date;
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

const STATUS_PILLS: Record<PickupStatus, { label: string; className: string }> = {
  REQUESTED: { label: 'Requested', className: 'bg-amber-soft text-amber' },
  ASSIGNED: { label: 'Assigned', className: 'bg-leaf-soft text-leaf-dark' },
  EN_ROUTE: { label: 'En route', className: 'bg-leaf text-surface' },
  COLLECTED: { label: 'Collected', className: 'bg-surface-muted text-muted' },
  CANCELLED: { label: 'Cancelled', className: 'bg-danger-soft text-danger' },
};

const SKIP_REASON_LABELS: Record<NonNullable<CollectorEvaluation['skip_reason']>, string> = {
  OUT_OF_RADIUS: 'Outside service radius',
  INSUFFICIENT_CAPACITY: 'Not enough vehicle capacity',
  E_WASTE_LICENSE_REQUIRED: 'E-waste licence required',
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

function FieldLabel({ children }: { children: string }) {
  return <Text className="text-ink text-[12px] font-extrabold mb-[7px]">{children}</Text>;
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

function CoordinateStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const step = (delta: number) => {
    const base = Number.parseFloat(value);
    const next = (Number.isFinite(base) ? base : 0) + delta;
    onChange(next.toFixed(4));
  };

  return (
    <View className="flex-1">
      <FieldLabel>{label}</FieldLabel>
      <View className="flex-row items-center border border-border rounded-sm bg-surface min-h-[52px]">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          className="w-[44px] h-[52px] items-center justify-center active:opacity-[0.72]"
          onPress={() => step(-COORD_STEP)}
        >
          <Ionicons name="remove" size={16} color={colors.muted} />
        </Pressable>
        <TextInput
          className="flex-1 text-ink text-[15px] font-bold text-center min-w-0"
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          accessibilityLabel={label}
          accessibilityHint={`Adjust in steps of ${COORD_STEP}`}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          className="w-[44px] h-[52px] items-center justify-center active:opacity-[0.72]"
          onPress={() => step(COORD_STEP)}
        >
          <Ionicons name="add" size={16} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

function BookingSuccessCard({ result }: { result: BookPickupResult }) {
  const assigned = result.assignment_status === 'ASSIGNED' && result.collector != null;

  return (
    <Animated.View
      entering={FadeInUp.duration(450)}
      className="bg-surface border border-border rounded-md p-[16px] shadow-card mb-[18px]"
      style={{ elevation: 2 }}
      accessibilityLiveRegion="polite"
    >
      <View className="flex-row items-center gap-[10px] mb-[10px]">
        <Ionicons
          name={assigned ? 'checkmark-circle' : 'hourglass-outline'}
          size={22}
          color={assigned ? colors.leaf : colors.amber}
        />
        <Text className="text-ink text-[17px] font-extrabold tracking-tight">
          {assigned ? 'Collector assigned' : 'Pending — no eligible collector'}
        </Text>
      </View>

      {assigned && result.collector ? (
        <>
          <Text className="text-ink text-[15px] font-bold">{result.collector.partner.org_name}</Text>
          <View className="flex-row flex-wrap gap-[8px] mt-[10px]">
            <View className="flex-row items-center gap-[5px] bg-surface-muted border border-border rounded-pill px-[10px] py-[4px]">
              <Ionicons name="bicycle-outline" size={13} color={colors.leafDark} />
              <Text className="text-leaf-dark text-[12px] font-bold">
                {result.collector.partner.vehicle_label ?? 'Collection vehicle'}
                {result.collector.partner.vehicle_capacity_kg != null
                  ? ` · ${Number(result.collector.partner.vehicle_capacity_kg)} kg`
                  : ''}
              </Text>
            </View>
            <View className="flex-row items-center gap-[5px] bg-surface-muted border border-border rounded-pill px-[10px] py-[4px]">
              <Ionicons name="navigate-outline" size={13} color={colors.leafDark} />
              <Text className="text-leaf-dark text-[12px] font-bold">
                {result.collector.distance_km} km away
              </Text>
            </View>
            {result.collector.remaining_capacity_kg != null ? (
              <View className="flex-row items-center gap-[5px] bg-surface-muted border border-border rounded-pill px-[10px] py-[4px]">
                <Ionicons name="scale-outline" size={13} color={colors.leafDark} />
                <Text className="text-leaf-dark text-[12px] font-bold">
                  {result.collector.remaining_capacity_kg} kg free
                </Text>
              </View>
            ) : null}
          </View>
        </>
      ) : (
        <Text className="text-muted text-[13px] leading-[19px]">
          Your pickup is queued as requested. Collector availability at this location:
        </Text>
      )}

      {result.eligibility.length > 0 ? (
        <View className="mt-[12px] gap-[6px]">
          {result.eligibility.map((row) => (
            <View
              key={row.partner_id}
              className="flex-row items-center justify-between bg-surface-muted border border-border rounded-sm px-[10px] py-[7px]"
            >
              <View className="flex-1 pr-[8px]">
                <Text className="text-ink text-[13px] font-bold" numberOfLines={1}>
                  {row.org_name}
                </Text>
                <Text className="text-muted text-[11px]">
                  {row.distance_km} km away
                  {row.remaining_capacity_kg != null ? ` · ${row.remaining_capacity_kg} kg free` : ''}
                </Text>
              </View>
              <View className="flex-row items-center gap-[4px]">
                <Ionicons
                  name={row.eligible ? 'checkmark' : 'close'}
                  size={13}
                  color={row.eligible ? colors.leaf : colors.danger}
                />
                <Text
                  className={`text-[11px] font-bold ${row.eligible ? 'text-leaf-dark' : 'text-danger'}`}
                >
                  {row.eligible
                    ? 'Eligible'
                    : (row.skip_reason != null ? SKIP_REASON_LABELS[row.skip_reason] : 'Unavailable')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

function PickupCard({
  order,
  onCancel,
  cancelling,
}: {
  order: PickupOrder;
  onCancel: (order: PickupOrder) => void;
  cancelling: boolean;
}) {
  const cancellable = order.status === 'REQUESTED' || order.status === 'ASSIGNED';

  return (
    <View className="bg-surface border border-border rounded-md p-[16px] shadow-card" style={{ elevation: 2 }}>
      <View className="flex-row items-start justify-between gap-[10px]">
        <View className="flex-1">
          <StatusPill status={order.status} />
          <Text className="text-ink text-[15px] font-bold mt-[8px]" numberOfLines={2}>
            {order.address}
          </Text>
          <Text className="text-muted text-[12px] mt-[3px]">
            {listingSummaryLabel(order.listing)} · {formatSchedule(order.scheduled_for)}
          </Text>
          {order.collector ? (
            <Text className="text-leaf-dark text-[12px] font-bold mt-[5px]" numberOfLines={1}>
              {order.collector.org_name}
              {order.collector.vehicle_label ? ` · ${order.collector.vehicle_label}` : ''}
            </Text>
          ) : null}
        </View>
        {cancellable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cancel pickup at ${order.address}`}
            accessibilityState={{ disabled: cancelling }}
            disabled={cancelling}
            className="self-start min-h-[36px] justify-center px-[12px] rounded-sm border border-danger active:opacity-[0.72]"
            onPress={() => onCancel(order)}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Text className="text-danger text-[12px] font-extrabold">Cancel</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function CustomerPickupView() {
  const listingsQuery = useMyListings();
  const pickupsQuery = usePickups();
  const bookPickup = useBookPickup();
  const updateStatus = useUpdatePickupStatus();

  const listings = listingsQuery.data ?? [];
  const pickups = pickupsQuery.data?.pickups ?? [];

  const [listingId, setListingId] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [latText, setLatText] = useState(DHAKA_DEMO.lat);
  const [lngText, setLngText] = useState(DHAKA_DEMO.lng);
  const [notes, setNotes] = useState('');
  const [scheduleKey, setScheduleKey] = useState<SchedulePreset>(SCHEDULE_PRESETS[0].key);

  const selectedListing: MyListing | null = listings.find((item) => item.id === listingId) ?? null;
  const parsedLat = Number.parseFloat(latText);
  const parsedLng = Number.parseFloat(lngText);
  const canSubmit =
    selectedListing != null &&
    address.trim().length >= 5 &&
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLng) &&
    !bookPickup.isPending;

  const submit = useCallback(() => {
    if (selectedListing == null || !canSubmit) return;
    bookPickup.mutate({
      listingId: selectedListing.id,
      address: address.trim(),
      lat: parsedLat,
      lng: parsedLng,
      scheduledFor: presetToDate(scheduleKey).toISOString(),
      notes: notes.trim() === '' ? undefined : notes.trim(),
    });
  }, [selectedListing, canSubmit, bookPickup, address, parsedLat, parsedLng, scheduleKey, notes]);

  const listingsError = listingsQuery.error
    ? getErrorMessage(listingsQuery.error, 'Could not load your listings.')
    : '';
  const pickupsError = pickupsQuery.error
    ? getErrorMessage(pickupsQuery.error, 'Could not load your pickups.')
    : '';

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={pickupsQuery.isRefetching}
          onRefresh={() => {
            void listingsQuery.refetch();
            void pickupsQuery.refetch();
          }}
          colors={[colors.leaf]}
          tintColor={colors.leaf}
        />
      }
    >
      <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">SMART GEO-DISPATCH</Text>
      <Text accessibilityRole="header" className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]">
        Book a pickup
      </Text>
      <Text className="text-muted text-[14px] leading-[21px] mt-[6px] mb-[18px]">
        Choose a listing, drop a pin on your neighbourhood, and we instantly match the nearest
        collector whose vehicle fits and is licensed for it.
      </Text>

      {bookPickup.error ? (
        <Text accessibilityRole="alert" className="text-danger bg-danger-soft p-[12px] rounded-[10px] mb-[14px] text-[13px] leading-[19px]">
          {getErrorMessage(bookPickup.error, 'Could not book this pickup.')}
        </Text>
      ) : null}

      {bookPickup.data ? <BookingSuccessCard result={bookPickup.data} /> : null}

      <View className="bg-surface border border-border rounded-md p-[16px] shadow-card mb-[18px]" style={{ elevation: 2 }}>
        <FieldLabel>Listing to collect</FieldLabel>
        {listingsQuery.isLoading ? (
          <ActivityIndicator color={colors.leaf} size="small" className="py-[10px]" />
        ) : listingsError ? (
          <Text accessibilityRole="alert" className="text-danger text-[13px]">{listingsError}</Text>
        ) : listings.length === 0 ? (
          <View className="bg-surface-muted border border-border rounded-sm p-[12px]">
            <Text className="text-ink text-[13px] font-bold">No active listings yet</Text>
            <Text className="text-muted text-[12px] leading-[18px] mt-[3px]">
              Create a listing from the List tab first — pickups are booked against an active listing.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {listings.map((listing) => {
              const selected = listing.id === listingId;
              return (
                <Pressable
                  key={listing.id}
                  accessibilityRole="radio"
                  accessibilityLabel={listingSummaryLabel(listing)}
                  accessibilityState={{ checked: selected }}
                  className={`min-h-[48px] px-[14px] rounded-pill border justify-center active:opacity-[0.72] ${selected ? 'border-leaf bg-leaf-soft' : 'border-border bg-surface'}`}
                  onPress={() => setListingId(listing.id)}
                >
                  <Text className={`text-[13px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}>
                    {listingSummaryLabel(listing)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View className="h-[18px]" />

        <FieldLabel>Pickup address</FieldLabel>
        <TextInput
          className="border border-border rounded-sm bg-surface min-h-[52px] px-[14px] text-ink text-[15px] font-bold"
          value={address}
          onChangeText={setAddress}
          placeholder="House 12, Road 5, Dhanmondi, Dhaka"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Pickup address"
          accessibilityHint="Street address where the collector should arrive"
        />

        <View className="h-[18px]" />

        <View className="flex-row gap-[12px]">
          <CoordinateStepper label="Latitude" value={latText} onChange={setLatText} />
          <CoordinateStepper label="Longitude" value={lngText} onChange={setLngText} />
        </View>

        <View className="h-[18px]" />

        <FieldLabel>When</FieldLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {SCHEDULE_PRESETS.map((preset) => {
            const selected = scheduleKey === preset.key;
            return (
              <Pressable
                key={preset.key}
                accessibilityRole="radio"
                accessibilityLabel={preset.label}
                accessibilityState={{ checked: selected }}
                className={`min-h-[48px] px-[14px] rounded-pill border items-center justify-center active:opacity-[0.72] ${selected ? 'border-leaf bg-leaf-soft' : 'border-border bg-surface'}`}
                onPress={() => setScheduleKey(preset.key)}
              >
                <Text className={`text-[13px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}>
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="h-[18px]" />

        <FieldLabel>Notes for the collector</FieldLabel>
        <TextInput
          className="border border-border rounded-sm bg-surface min-h-[52px] px-[14px] py-[12px] text-ink text-[15px]"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Ring the bell twice, gate is on Road 5"
          placeholderTextColor={colors.muted}
          multiline
          accessibilityLabel="Notes for the collector"
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Book pickup"
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          className={`min-h-[52px] rounded-sm items-center justify-center mt-[18px] active:opacity-[0.72] ${canSubmit ? 'bg-leaf' : 'bg-surface-muted'}`}
          onPress={submit}
        >
          {bookPickup.isPending ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Text className={`text-[15px] font-extrabold ${canSubmit ? 'text-surface' : 'text-muted'}`}>
              Book pickup
            </Text>
          )}
        </Pressable>
      </View>

      <Text accessibilityRole="header" className="text-ink text-[19px] font-extrabold tracking-tight mb-[10px]">
        My pickups
      </Text>
      {pickupsError ? (
        <Text accessibilityRole="alert" className="text-danger bg-danger-soft p-[12px] rounded-[10px] mb-[12px] text-[13px] leading-[19px]">
          {pickupsError}
        </Text>
      ) : null}
      {pickupsQuery.isLoading ? (
        <ActivityIndicator color={colors.leaf} size="small" className="py-[16px]" />
      ) : pickups.length === 0 && !pickupsError ? (
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
              onCancel={(target) =>
                updateStatus.mutate({ id: target.id, status: 'CANCELLED' })
              }
              cancelling={
                updateStatus.isPending &&
                updateStatus.variables?.id === order.id &&
                updateStatus.variables?.status === 'CANCELLED'
              }
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const MAP_W = 320;
const MAP_H = 208;
const MAP_PAD = 32;

function RouteMapSvg({ base, stops }: { base: { lat: number; lng: number }; stops: RouteStop[] }) {
  const points = useMemo(() => {
    const all = [base, ...stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }))];
    const lats = all.map((p) => p.lat);
    const lngs = all.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = maxLat - minLat || 1e-6;
    const spanLng = maxLng - minLng || 1e-6;
    return all.map((p) => ({
      x: MAP_PAD + ((p.lng - minLng) / spanLng) * (MAP_W - MAP_PAD * 2),
      y: MAP_H - MAP_PAD - ((p.lat - minLat) / spanLat) * (MAP_H - MAP_PAD * 2),
    }));
  }, [base, stops]);

  const path = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const start = points[0];

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Route map with ${stops.length} stops, starting from the collector base`}
      className="rounded-md border border-border bg-surface overflow-hidden"
      style={{ elevation: 2 }}
    >
      <Svg width="100%" height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        {/* subtle graticule so the canvas reads as a map */}
        {[0.25, 0.5, 0.75].map((fraction) => (
          <Polyline
            key={`grid-v-${fraction}`}
            points={`${MAP_W * fraction},0 ${MAP_W * fraction},${MAP_H}`}
            fill="none"
            stroke={colors.surfaceMuted}
            strokeWidth={1}
          />
        ))}
        {[0.25, 0.5, 0.75].map((fraction) => (
          <Polyline
            key={`grid-h-${fraction}`}
            points={`0,${MAP_H * fraction} ${MAP_W},${MAP_H * fraction}`}
            fill="none"
            stroke={colors.surfaceMuted}
            strokeWidth={1}
          />
        ))}

        {/* dashed route from the base through every stop in visit order */}
        <Polyline
          points={path}
          fill="none"
          stroke={colors.leaf}
          strokeWidth={2.5}
          strokeDasharray="7 5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* distinct start marker for the collector's base */}
        <Circle cx={start.x} cy={start.y} r={16} fill={colors.leafSoft} />
        <Circle cx={start.x} cy={start.y} r={10} fill={colors.leafDark} />
        <SvgText
          x={start.x}
          y={start.y + 3.5}
          fill={colors.surface}
          fontSize={10}
          fontWeight="800"
          textAnchor="middle"
        >
          GO
        </SvgText>

        {/* numbered stop markers */}
        {points.slice(1).map((point, index) => (
          <Circle
            key={`stop-${index}`}
            cx={point.x}
            cy={point.y}
            r={11}
            fill={colors.surface}
            stroke={colors.leaf}
            strokeWidth={2.5}
          />
        ))}
        {points.slice(1).map((point, index) => (
          <SvgText
            key={`stop-label-${index}`}
            x={point.x}
            y={point.y + 4}
            fill={colors.ink}
            fontSize={11}
            fontWeight="800"
            textAnchor="middle"
          >
            {index + 1}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

function CollectorStopCard({
  stop,
  onAdvance,
  advancing,
}: {
  stop: RouteStop;
  onAdvance: (stop: RouteStop, status: PickupStatus) => void;
  advancing: boolean;
}) {
  return (
    <Animated.View
      entering={FadeInUp.duration(350).delay(stop.stop_sequence * 70)}
      className="bg-surface border border-border rounded-md p-[16px] shadow-card"
      style={{ elevation: 2 }}
    >
      <View className="flex-row items-start gap-[12px]">
        <View className="w-[30px] h-[30px] rounded-pill bg-leaf items-center justify-center" accessibilityElementsHidden>
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
              “{stop.notes}”
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

          {stop.status === 'ASSIGNED' || stop.status === 'EN_ROUTE' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                stop.status === 'ASSIGNED'
                  ? `Start route to ${stop.address}`
                  : `Mark pickup at ${stop.address} as collected`
              }
              accessibilityState={{ disabled: advancing }}
              disabled={advancing}
              className="min-h-[44px] rounded-sm items-center justify-center mt-[12px] active:opacity-[0.72] bg-leaf flex-row gap-[6px]"
              onPress={() => onAdvance(stop, stop.status === 'ASSIGNED' ? 'EN_ROUTE' : 'COLLECTED')}
            >
              {advancing ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <>
                  <Ionicons
                    name={stop.status === 'ASSIGNED' ? 'navigate' : 'checkmark'}
                    size={15}
                    color={colors.surface}
                  />
                  <Text className="text-surface text-[13px] font-extrabold">
                    {stop.status === 'ASSIGNED' ? 'Start route' : 'Mark collected'}
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

function CollectorRouteView({ partner }: { partner: PartnerProfile }) {
  const routeQuery = useCollectorRoute(true);
  const updateStatus = useUpdatePickupStatus();

  const route = routeQuery.data ?? null;
  const stops = route?.stops ?? [];
  const totalKm = stops.reduce((sum, stop) => sum + stop.distance_from_previous_km, 0);
  const totalEta = stops.length > 0 ? stops[stops.length - 1].cumulative_eta_minutes : 0;
  const liveRouting = route?.routing_source === 'mapbox';

  const advance = useCallback(
    (stop: RouteStop, status: PickupStatus) => {
      updateStatus.mutate({ id: stop.order_id, status });
    },
    [updateStatus],
  );

  return (
    <StateView
      fullScreen
      isLoading={routeQuery.isLoading}
      loadingTitle="Optimizing your route"
      loadingSubtitle="Ordering stops by driving distance and time."
      error={routeQuery.error}
      errorTitle="Route unavailable"
      errorMessage={routeQuery.error ? getErrorMessage(routeQuery.error, 'Could not load the collector route.') : undefined}
      onRetry={() => void routeQuery.refetch()}
      retryLabel="Try again"
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={routeQuery.isRefetching}
            onRefresh={() => void routeQuery.refetch()}
            colors={[colors.leaf]}
            tintColor={colors.leaf}
          />
        }
      >
        <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">COLLECTOR CONSOLE</Text>
        <Text accessibilityRole="header" className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]">
          {partner.org_name}
        </Text>
        <Text className="text-muted text-[14px] leading-[21px] mt-[6px] mb-[18px]">
          Your optimized pickup route for today, refreshed live every 30 seconds.
        </Text>

        <View className="flex-row flex-wrap gap-[8px] mb-[14px]">
          <View
            className={`flex-row items-center gap-[5px] rounded-pill px-[12px] py-[5px] border ${liveRouting ? 'bg-leaf-soft border-leaf' : 'bg-amber-soft border-amber'}`}
            accessibilityRole="text"
            accessibilityLabel={liveRouting ? 'Mapbox live routing' : 'Offline haversine routing'}
          >
            <Ionicons name={liveRouting ? 'git-network-outline' : 'cloud-offline-outline'} size={13} color={liveRouting ? colors.leafDark : colors.amber} />
            <Text className={`text-[12px] font-extrabold ${liveRouting ? 'text-leaf-dark' : 'text-amber'}`}>
              {liveRouting ? 'Mapbox live routing' : 'Offline haversine routing'}
            </Text>
          </View>
          <View className="flex-row items-center gap-[5px] bg-surface border border-border rounded-pill px-[12px] py-[5px]">
            <Ionicons name="location-outline" size={13} color={colors.leafDark} />
            <Text className="text-leaf-dark text-[12px] font-bold">{stops.length} stops</Text>
          </View>
          <View className="flex-row items-center gap-[5px] bg-surface border border-border rounded-pill px-[12px] py-[5px]">
            <Ionicons name="resize-outline" size={13} color={colors.leafDark} />
            <Text className="text-leaf-dark text-[12px] font-bold">{totalKm.toFixed(2)} km</Text>
          </View>
          <View className="flex-row items-center gap-[5px] bg-surface border border-border rounded-pill px-[12px] py-[5px]">
            <Ionicons name="time-outline" size={13} color={colors.leafDark} />
            <Text className="text-leaf-dark text-[12px] font-bold">{totalEta} min total</Text>
          </View>
        </View>

        {updateStatus.error ? (
          <Text accessibilityRole="alert" className="text-danger bg-danger-soft p-[12px] rounded-[10px] mb-[14px] text-[13px] leading-[19px]">
            {getErrorMessage(updateStatus.error, 'Could not update this pickup.')}
          </Text>
        ) : null}

        {stops.length === 0 ? (
          <StateView
            isEmpty
            emptyIcon="navigate-outline"
            emptyTitle="No stops on today's route"
            emptyMessage="New pickups assigned to you will appear here the moment they are booked."
            containerClassName="border border-border rounded-md bg-surface"
          />
        ) : (
          <>
            <Animated.View entering={FadeInUp.duration(500)} className="mb-[16px]">
              <RouteMapSvg base={route?.base ?? { lat: 0, lng: 0 }} stops={stops} />
            </Animated.View>
            <View className="gap-[12px]">
              {stops.map((stop) => (
                <CollectorStopCard
                  key={stop.order_id}
                  stop={stop}
                  onAdvance={advance}
                  advancing={
                    updateStatus.isPending &&
                    updateStatus.variables?.id === stop.order_id
                  }
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </StateView>
  );
}

export function PickupScreen() {
  const partnerQuery = usePartnerMe();
  const partner = partnerQuery.data ?? null;

  if (partnerQuery.isLoading) {
    return (
      <StateView
        fullScreen
        isLoading
        loadingTitle="Preparing dispatch"
        loadingSubtitle="Checking whether you collect pickups or book them."
      />
    );
  }

  if (partnerQuery.error) {
    return (
      <StateView
        fullScreen
        error={partnerQuery.error}
        errorTitle="Dispatch unavailable"
        errorMessage={getErrorMessage(partnerQuery.error, 'Could not load your partner profile.')}
        onRetry={() => void partnerQuery.refetch()}
        retryLabel="Try again"
      />
    );
  }

  return isCollectorPartner(partner) && partner ? (
    <CollectorRouteView partner={partner} />
  ) : (
    <CustomerPickupView />
  );
}
