import React from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { colors } from '@/theme';
import { CoordinateStepper } from '@/components/dispatch/CoordinateStepper';
import { ListingSelector } from '@/components/dispatch/ListingSelector';
import { SchedulePicker, type SchedulePreset } from '@/components/dispatch/SchedulePicker';
import type { MyListing } from '@/hooks/useMyListings';

export interface CustomerPickupFormProps {
  listings: MyListing[];
  selectedListingId: string | null;
  onSelectListingId: (id: string) => void;
  address: string;
  onChangeAddress: (address: string) => void;
  latText: string;
  onChangeLatText: (lat: string) => void;
  lngText: string;
  onChangeLngText: (lng: string) => void;
  scheduleKey: SchedulePreset;
  onSelectScheduleKey: (key: SchedulePreset) => void;
  notes: string;
  onChangeNotes: (notes: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isPending: boolean;
}

export const CustomerPickupForm = React.memo(function CustomerPickupForm({
  listings,
  selectedListingId,
  onSelectListingId,
  address,
  onChangeAddress,
  latText,
  onChangeLatText,
  lngText,
  onChangeLngText,
  scheduleKey,
  onSelectScheduleKey,
  notes,
  onChangeNotes,
  onSubmit,
  canSubmit,
  isPending,
}: CustomerPickupFormProps) {
  return (
    <View
      className="bg-surface border border-border rounded-md p-[16px] mb-[24px] shadow-card"
      style={{ elevation: 2 }}
    >
      <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px] mb-[12px]">
        PICKUP DETAILS
      </Text>

      <Text className="text-ink text-[12px] font-extrabold mb-[7px]">Select your scrap item</Text>
      <ListingSelector
        listings={listings}
        selectedListingId={selectedListingId}
        onSelectListingId={onSelectListingId}
      />

      <View className="h-[16px]" />

      <Text className="text-ink text-[12px] font-extrabold mb-[7px]">Pickup address</Text>
      <TextInput
        className="border border-border rounded-sm bg-background min-h-[50px] px-[14px] text-ink text-[15px] font-bold"
        value={address}
        onChangeText={onChangeAddress}
        placeholder="House 12, Road 5, Dhanmondi, Dhaka"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Pickup address"
      />

      <View className="h-[16px]" />

      <View className="flex-row gap-[12px]">
        <CoordinateStepper label="Latitude" value={latText} onChange={onChangeLatText} />
        <CoordinateStepper label="Longitude" value={lngText} onChange={onChangeLngText} />
      </View>

      <View className="h-[16px]" />

      <Text className="text-ink text-[12px] font-extrabold mb-[7px]">Schedule window</Text>
      <SchedulePicker selectedKey={scheduleKey} onSelectKey={onSelectScheduleKey} />

      <View className="h-[16px]" />

      <Text className="text-ink text-[12px] font-extrabold mb-[7px]">Notes for the collector</Text>
      <TextInput
        className="border border-border rounded-sm bg-background min-h-[50px] px-[14px] py-[10px] text-ink text-[15px]"
        value={notes}
        onChangeText={onChangeNotes}
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
        className={`min-h-[52px] rounded-sm items-center justify-center mt-[18px] active:opacity-[0.72] ${
          canSubmit ? 'bg-leaf' : 'bg-surface-muted'
        }`}
        onPress={onSubmit}
      >
        {isPending ? (
          <ActivityIndicator size="small" color={colors.surface} />
        ) : (
          <Text
            className={`text-[15px] font-extrabold ${canSubmit ? 'text-surface' : 'text-muted'}`}
          >
            Book pickup
          </Text>
        )}
      </Pressable>
    </View>
  );
});
