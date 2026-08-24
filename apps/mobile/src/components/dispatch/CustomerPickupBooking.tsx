import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text } from 'react-native';
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import {
  useBookPickup,
  usePickups,
  useUpdatePickupStatus,
  type BookPickupResult,
  type PickupOrder,
} from '@/hooks/usePickups';
import { useMyListings } from '@/hooks/useMyListings';
import { BookingSuccessCard } from '@/components/dispatch/BookingSuccessCard';
import { CustomerPickupForm } from '@/components/dispatch/CustomerPickupForm';
import { CustomerPickupList } from '@/components/dispatch/CustomerPickupList';
import { presetToDate, type SchedulePreset } from '@/components/dispatch/SchedulePicker';

const DHAKA_DEMO = { lat: '23.7806', lng: '90.4192' };

export const CustomerPickupBooking = React.memo(function CustomerPickupBooking() {
  const listingsQuery = useMyListings();
  const pickupsQuery = usePickups();
  const bookPickup = useBookPickup();
  const updateStatus = useUpdatePickupStatus();

  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [latText, setLatText] = useState(DHAKA_DEMO.lat);
  const [lngText, setLngText] = useState(DHAKA_DEMO.lng);
  const [scheduleKey, setScheduleKey] = useState<SchedulePreset>('today-evening');
  const [notes, setNotes] = useState('');
  const [lastResult, setLastResult] = useState<BookPickupResult | null>(null);

  const listings = useMemo(
    () => (listingsQuery.data ?? []).filter((item) => item.status === 'ACTIVE'),
    [listingsQuery.data],
  );

  React.useEffect(() => {
    if (!selectedListingId && listings.length > 0) {
      setSelectedListingId(listings[0].id);
    }
  }, [listings, selectedListingId]);

  const pickups = pickupsQuery.data?.pickups ?? [];
  const parsedLat = Number.parseFloat(latText);
  const parsedLng = Number.parseFloat(lngText);
  const canSubmit =
    Boolean(selectedListingId) &&
    address.trim().length >= 3 &&
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLng) &&
    !bookPickup.isPending;

  const submit = useCallback(() => {
    if (!selectedListingId || !canSubmit) return;
    setLastResult(null);
    bookPickup.mutate(
      {
        listingId: selectedListingId,
        address: address.trim(),
        lat: parsedLat,
        lng: parsedLng,
        scheduledFor: presetToDate(scheduleKey).toISOString(),
        notes: notes.trim() ? notes.trim() : undefined,
      },
      {
        onSuccess: (res) => {
          setLastResult(res);
          setNotes('');
        },
      },
    );
  }, [selectedListingId, canSubmit, bookPickup, address, parsedLat, parsedLng, scheduleKey, notes]);

  const cancelPickup = useCallback(
    (order: PickupOrder) => {
      updateStatus.mutate({ id: order.id, status: 'CANCELLED' });
    },
    [updateStatus],
  );

  const isRefetching = listingsQuery.isRefetching || pickupsQuery.isRefetching;
  const onRefresh = useCallback(() => {
    void listingsQuery.refetch();
    void pickupsQuery.refetch();
  }, [listingsQuery, pickupsQuery]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          colors={[colors.leaf]}
          tintColor={colors.leaf}
        />
      }
    >
      <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">
        DOORSTEP LOGISTICS
      </Text>
      <Text
        accessibilityRole="header"
        className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]"
      >
        Book a scrap pickup
      </Text>
      <Text className="text-muted text-[14px] leading-[21px] mt-[6px] mb-[18px]">
        A verified recycling collector will arrive at your address, weigh the scrap on-site, and
        confirm your Green Wallet payout.
      </Text>

      {lastResult ? <BookingSuccessCard result={lastResult} /> : null}

      {bookPickup.error ? (
        <Text
          accessibilityRole="alert"
          className="text-danger bg-danger-soft p-[12px] rounded-[10px] mb-[14px] text-[13px] leading-[19px]"
        >
          {getErrorMessage(bookPickup.error, 'Could not book this pickup.')}
        </Text>
      ) : null}

      <CustomerPickupForm
        listings={listings}
        selectedListingId={selectedListingId}
        onSelectListingId={setSelectedListingId}
        address={address}
        onChangeAddress={setAddress}
        latText={latText}
        onChangeLatText={setLatText}
        lngText={lngText}
        onChangeLngText={setLngText}
        scheduleKey={scheduleKey}
        onSelectScheduleKey={setScheduleKey}
        notes={notes}
        onChangeNotes={setNotes}
        onSubmit={submit}
        canSubmit={canSubmit}
        isPending={bookPickup.isPending}
      />

      <CustomerPickupList
        pickups={pickups}
        isLoading={pickupsQuery.isLoading}
        onCancelPickup={cancelPickup}
        cancellingId={
          updateStatus.isPending && updateStatus.variables?.status === 'CANCELLED'
            ? updateStatus.variables.id
            : undefined
        }
      />
    </ScrollView>
  );
});
