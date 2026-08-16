// PartnerConsoleScreen: Operational console for verified recycling/collection partners.
// Provides waste pickup collection queue, capability management, and scanner shortcuts.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { CATEGORIES, categoryLabel } from '@/types';
import { ListingCard } from '@/components/ListingCard';
import { StateView } from '@/components/ui/StateView';
import { Button } from '@/components/ui/Button';
import { usePartner, useUpdatePartnerCapabilities } from '@/hooks/usePartner';
import { useFeed, type FeedFilter, type Listing } from '@/hooks/useFeed';
import { getErrorMessage } from '@/services/api';

type ConsoleSegment = 'queue' | 'capabilities' | 'compliance';

interface PartnerConsoleScreenProps {
  onBack?: () => void;
  onOpenScanner?: () => void;
  onOpenStatus?: () => void;
}

const PARTNER_FEED_CATEGORIES: FeedFilter[] = ['ALL', ...CATEGORIES];

export function PartnerConsoleScreen({
  onBack,
  onOpenScanner,
  onOpenStatus,
}: PartnerConsoleScreenProps) {
  const { data: partnerData, isLoading: partnerLoading, refetch: refetchPartner, isRefetching: partnerRefetching } = usePartner();
  const partner = partnerData?.partner;
  const updateCapabilitiesMutation = useUpdatePartnerCapabilities();

  const [activeSegment, setActiveSegment] = useState<ConsoleSegment>('queue');
  const [selectedCategory, setSelectedCategory] = useState<FeedFilter>('ALL');
  const [selectedClaimListing, setSelectedClaimListing] = useState<Listing | null>(null);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(null);

  // Waste collection feed
  const {
    data: feedData,
    isLoading: feedLoading,
    error: feedError,
    refetch: refetchFeed,
    isRefetching: feedRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeed(selectedCategory, 'ALL');

  const items = feedData?.pages.flatMap((page) => page.items) ?? [];
  const feedErrorMessage = feedError ? getErrorMessage(feedError, 'Could not load collection queue.') : '';

  // Capabilities local switch toggling with optimistic sync
  const currentCapabilities = partner?.capability_flags ?? {};

  const handleToggleCapability = (key: string, value: boolean) => {
    const updated = { ...currentCapabilities, [key]: value };
    updateCapabilitiesMutation.mutate(updated, {
      onError: (err) => {
        Alert.alert('Update Failed', getErrorMessage(err, 'Failed to update capability flag.'));
      },
    });
  };

  const handleClaimPickup = (listing: Listing) => {
    setSelectedClaimListing(listing);
  };

  const handleConfirmClaim = () => {
    if (!selectedClaimListing) return;
    const catLabel = categoryLabel(selectedClaimListing.category);
    setSelectedClaimListing(null);
    setClaimSuccessMessage(`Collection registered for ${catLabel} listing #${selectedClaimListing.id.slice(0, 8)}. Proceed to drop zone or user handover.`);
    setTimeout(() => setClaimSuccessMessage(null), 5000);
  };

  if (partnerLoading && !partner) {
    return (
      <View className="flex-1 bg-background justify-center items-center p-6">
        <ActivityIndicator size="large" color={colors.leaf} />
        <Text className="text-muted text-sm mt-3 font-semibold">Loading Partner Console...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header bar */}
      <View className="px-5 pt-3 pb-3 border-b border-border bg-surface flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
              className="w-10 h-10 rounded-xl bg-background items-center justify-center border border-border active:opacity-[0.72]"
              onPress={onBack}
            >
              <Ionicons name="arrow-back" size={20} color={colors.ink} />
            </Pressable>
          ) : null}
          <View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="shield-checkmark" size={16} color={colors.leaf} />
              <Text className="text-leaf text-[11px] font-extrabold tracking-wider uppercase">
                Partner Console
              </Text>
            </View>
            <Text className="text-ink text-xl font-extrabold tracking-tight" numberOfLines={1}>
              {partner?.org_name ?? 'Partner Organization'}
            </Text>
          </View>
        </View>

        {onOpenStatus ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View Verification Status"
            className="px-3 py-1.5 rounded-lg bg-leaf-soft border border-leaf items-center justify-center active:opacity-[0.72]"
            onPress={onOpenStatus}
          >
            <Text className="text-leaf-dark text-xs font-bold">Status</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Verified Partner Summary Banner */}
      <View className="mx-5 mt-4 p-4 rounded-2xl bg-leaf-dark border border-leaf-dark">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <View className="flex-row items-center gap-1.5">
              <View className="px-2 py-0.5 rounded-full bg-surface/20">
                <Text className="text-surface text-[10px] font-extrabold uppercase tracking-wide">
                  {partner?.status === 'VERIFIED' ? 'Verified Partner' : (partner?.status ?? 'Partner')}
                </Text>
              </View>
              {partner?.e_waste_licensed ? (
                <View className="px-2 py-0.5 rounded-full bg-surface/20 flex-row items-center gap-1">
                  <Ionicons name="shield-checkmark" size={10} color={colors.surface} />
                  <Text className="text-surface text-[10px] font-bold">DoE Licensed</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-surface text-base font-extrabold mt-1.5" numberOfLines={1}>
              {partner?.org_name}
            </Text>
            <Text className="text-surface/80 text-xs mt-0.5">
              {partner?.types?.join(' · ') || 'Circular Partner'}
            </Text>
          </View>

          {onOpenScanner ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scan Handover QR"
              className="px-3.5 py-2.5 rounded-xl bg-surface items-center justify-center flex-row gap-1.5 shadow-sm active:opacity-[0.8]"
              onPress={onOpenScanner}
            >
              <Ionicons name="scan" size={18} color={colors.leafDark} />
              <Text className="text-leaf-dark text-xs font-extrabold">Scan QR</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Segment Selector Tabs */}
      <View className="flex-row mx-5 mt-4 bg-surface p-1 rounded-xl border border-border">
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Collection Queue"
          accessibilityState={{ selected: activeSegment === 'queue' }}
          className={`flex-1 py-2.5 rounded-lg items-center justify-center ${activeSegment === 'queue' ? 'bg-leaf-soft border border-leaf' : ''}`}
          onPress={() => setActiveSegment('queue')}
        >
          <Text className={`text-xs font-extrabold ${activeSegment === 'queue' ? 'text-leaf-dark' : 'text-muted'}`}>
            Pickup Queue
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Capabilities"
          accessibilityState={{ selected: activeSegment === 'capabilities' }}
          className={`flex-1 py-2.5 rounded-lg items-center justify-center ${activeSegment === 'capabilities' ? 'bg-leaf-soft border border-leaf' : ''}`}
          onPress={() => setActiveSegment('capabilities')}
        >
          <Text className={`text-xs font-extrabold ${activeSegment === 'capabilities' ? 'text-leaf-dark' : 'text-muted'}`}>
            Capabilities
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Compliance"
          accessibilityState={{ selected: activeSegment === 'compliance' }}
          className={`flex-1 py-2.5 rounded-lg items-center justify-center ${activeSegment === 'compliance' ? 'bg-leaf-soft border border-leaf' : ''}`}
          onPress={() => setActiveSegment('compliance')}
        >
          <Text className={`text-xs font-extrabold ${activeSegment === 'compliance' ? 'text-leaf-dark' : 'text-muted'}`}>
            Compliance
          </Text>
        </Pressable>
      </View>

      {/* Notification Toast */}
      {claimSuccessMessage ? (
        <View className="mx-5 mt-3 p-3 rounded-xl bg-leaf-soft border border-leaf flex-row items-center gap-2">
          <Ionicons name="checkmark-circle" size={18} color={colors.leafDark} />
          <Text className="text-leaf-dark text-xs font-bold flex-1">{claimSuccessMessage}</Text>
        </View>
      ) : null}

      {/* Segment Content */}
      {activeSegment === 'queue' ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="mb-2">
              <ListingCard item={item} />
              <View className="mt-1 flex-row justify-end">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Claim ${categoryLabel(item.category)} for collection`}
                  className="px-4 py-2 rounded-xl bg-leaf items-center justify-center flex-row gap-1.5 active:opacity-[0.8]"
                  onPress={() => handleClaimPickup(item)}
                >
                  <Ionicons name="cube-outline" size={16} color={colors.surface} />
                  <Text className="text-surface text-xs font-extrabold">Claim for Pickup</Text>
                </Pressable>
              </View>
            </View>
          )}
          contentContainerStyle={[{ padding: 20, paddingTop: 12, paddingBottom: 40 }, items.length === 0 && { flexGrow: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={feedRefetching || partnerRefetching}
              onRefresh={() => {
                void refetchFeed();
                void refetchPartner();
              }}
              colors={[colors.leaf]}
              tintColor={colors.leaf}
            />
          }
          ListHeaderComponent={
            <View className="mb-3">
              <Text className="text-ink text-sm font-extrabold mb-1">Available Circular Materials</Text>
              <Text className="text-muted text-xs mb-3">
                Listings from campuses and community members available for collection & recycling.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {PARTNER_FEED_CATEGORIES.map((cat) => {
                  const selected = selectedCategory === cat;
                  const label = cat === 'ALL' ? 'All Materials' : categoryLabel(cat);
                  return (
                    <Pressable
                      key={cat}
                      accessibilityRole="radio"
                      accessibilityLabel={label}
                      accessibilityState={{ checked: selected }}
                      className={`min-h-[38px] px-3.5 rounded-full border items-center justify-center ${selected ? 'border-leaf bg-leaf-soft' : 'border-border bg-surface'}`}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text className={`text-xs font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}>{label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <StateView
              isLoading={feedLoading}
              loadingTitle="Loading Collection Queue"
              error={feedError}
              errorTitle="Queue Unavailable"
              errorMessage={feedErrorMessage}
              onRetry={() => void refetchFeed()}
              retryLabel="Refresh Queue"
              isEmpty={items.length === 0}
              emptyIcon="file-tray-outline"
              emptyTitle="No Pending Pickups"
              emptyMessage="There are currently no active listings matching your filter."
              containerClassName="flex-1 min-h-[220px] px-5 py-8"
            />
          }
          ListFooterComponent={
            items.length > 0 && hasNextPage ? (
              <View className="items-center pt-4">
                <Button
                  label={isFetchingNextPage ? 'Loading more...' : 'Load more items'}
                  loading={isFetchingNextPage}
                  onPress={() => void fetchNextPage()}
                />
              </View>
            ) : null
          }
        />
      ) : activeSegment === 'capabilities' ? (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={partnerRefetching}
              onRefresh={() => void refetchPartner()}
              colors={[colors.leaf]}
              tintColor={colors.leaf}
            />
          }
        >
          <View className="p-5 rounded-2xl bg-surface border border-border">
            <Text className="text-ink text-base font-extrabold">Operational Capabilities</Text>
            <Text className="text-muted text-xs mt-1 mb-5">
              Toggle the services your organization currently provides in the circular ecosystem.
            </Text>

            {/* Capability 1: Doorstep / Drop-zone collection */}
            <View className="flex-row items-center justify-between py-3.5 border-b border-border">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="car-outline" size={18} color={colors.leaf} />
                  <Text className="text-ink text-sm font-bold">Waste Collection</Text>
                </View>
                <Text className="text-muted text-xs mt-0.5">
                  Accept drop-zone pickups and doorstep scheduled collections.
                </Text>
              </View>
              <Switch
                value={Boolean(currentCapabilities.collects)}
                onValueChange={(val) => handleToggleCapability('collects', val)}
                trackColor={{ false: colors.border, true: colors.leaf }}
                thumbColor={colors.surface}
              />
            </View>

            {/* Capability 2: Repair & Refurbishment */}
            <View className="flex-row items-center justify-between py-3.5 border-b border-border">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="hammer-outline" size={18} color={colors.leaf} />
                  <Text className="text-ink text-sm font-bold">Repair & Refurbishing</Text>
                </View>
                <Text className="text-muted text-xs mt-0.5">
                  Receive repairable electronics and circular appliances.
                </Text>
              </View>
              <Switch
                value={Boolean(currentCapabilities.repairs)}
                onValueChange={(val) => handleToggleCapability('repairs', val)}
                trackColor={{ false: colors.border, true: colors.leaf }}
                thumbColor={colors.surface}
              />
            </View>

            {/* Capability 3: Scrap & Waste Purchasing */}
            <View className="flex-row items-center justify-between py-3.5 border-b border-border">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="cash-outline" size={18} color={colors.leaf} />
                  <Text className="text-ink text-sm font-bold">Scrap & Material Purchasing</Text>
                </View>
                <Text className="text-muted text-xs mt-0.5">
                  Purchase verified scrap materials with digital wallet credits.
                </Text>
              </View>
              <Switch
                value={Boolean(currentCapabilities.buys)}
                onValueChange={(val) => handleToggleCapability('buys', val)}
                trackColor={{ false: colors.border, true: colors.leaf }}
                thumbColor={colors.surface}
              />
            </View>

            {/* Capability 4: NGO Donations */}
            <View className="flex-row items-center justify-between py-3.5">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="heart-outline" size={18} color={colors.leaf} />
                  <Text className="text-ink text-sm font-bold">NGO Donation Intake</Text>
                </View>
                <Text className="text-muted text-xs mt-0.5">
                  Accept zero-cost circular donations for charitable redistribution.
                </Text>
              </View>
              <Switch
                value={Boolean(currentCapabilities.accepts_donations)}
                onValueChange={(val) => handleToggleCapability('accepts_donations', val)}
                trackColor={{ false: colors.border, true: colors.leaf }}
                thumbColor={colors.surface}
              />
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={partnerRefetching}
              onRefresh={() => void refetchPartner()}
              colors={[colors.leaf]}
              tintColor={colors.leaf}
            />
          }
        >
          <View className="p-5 rounded-2xl bg-surface border border-border">
            <Text className="text-ink text-base font-extrabold">Regulatory & Compliance</Text>
            <Text className="text-muted text-xs mt-1 mb-4">
              Authorized partner credentials and institutional verification data.
            </Text>

            <View className="gap-3">
              <View className="p-3.5 rounded-xl bg-background border border-border">
                <Text className="text-muted text-[11px] font-bold uppercase">Organization</Text>
                <Text className="text-ink text-sm font-extrabold mt-0.5">{partner?.org_name}</Text>
              </View>

              <View className="p-3.5 rounded-xl bg-background border border-border">
                <Text className="text-muted text-[11px] font-bold uppercase">DoE Regulatory License</Text>
                <View className="flex-row items-center gap-1.5 mt-1">
                  <Ionicons
                    name={partner?.e_waste_licensed ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={partner?.e_waste_licensed ? colors.leaf : colors.muted}
                  />
                  <Text className={`text-xs font-bold ${partner?.e_waste_licensed ? 'text-leaf-dark' : 'text-muted'}`}>
                    {partner?.e_waste_licensed ? 'Department of Environment Verified' : 'Standard Partner License'}
                  </Text>
                </View>
              </View>

              <View className="p-3.5 rounded-xl bg-background border border-border">
                <Text className="text-muted text-[11px] font-bold uppercase">Partner Classifications</Text>
                <View className="flex-row flex-wrap gap-1.5 mt-1.5">
                  {partner?.types?.map((t) => (
                    <View key={t} className="px-2.5 py-1 rounded-md bg-surface border border-border">
                      <Text className="text-ink text-xs font-bold">{t}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="p-3.5 rounded-xl bg-background border border-border">
                <Text className="text-muted text-[11px] font-bold uppercase">Partner ID</Text>
                <Text className="text-muted text-xs font-mono mt-0.5">{partner?.id}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Claim Pickup Modal */}
      <Modal
        visible={Boolean(selectedClaimListing)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedClaimListing(null)}
      >
        <View className="flex-1 bg-ink/50 justify-center items-center p-5">
          <View className="w-full max-w-sm p-6 rounded-3xl bg-surface border border-border">
            <View className="w-12 h-12 rounded-2xl bg-leaf-soft items-center justify-center mb-3">
              <Ionicons name="cube" size={24} color={colors.leafDark} />
            </View>
            <Text className="text-ink text-lg font-extrabold">Claim for Pickup</Text>
            <Text className="text-muted text-xs mt-1 leading-relaxed">
              Register your partner organization ({partner?.org_name}) to collect & process this circular material.
            </Text>

            <View className="my-4 p-3 rounded-xl bg-background border border-border">
              <Text className="text-ink text-xs font-bold">
                Material: {selectedClaimListing ? categoryLabel(selectedClaimListing.category) : ''}
              </Text>
              <Text className="text-muted text-[11px] mt-0.5">
                Condition: {selectedClaimListing ? categoryLabel(selectedClaimListing.declared_condition) : ''}
              </Text>
              {selectedClaimListing?.declared_weight ? (
                <Text className="text-muted text-[11px] mt-0.5">
                  Weight: {selectedClaimListing.declared_weight} kg
                </Text>
              ) : null}
            </View>

            <View className="flex-row gap-2.5 mt-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                className="flex-1 min-h-[48px] rounded-xl border border-border bg-surface items-center justify-center active:opacity-75"
                onPress={() => setSelectedClaimListing(null)}
              >
                <Text className="text-ink text-xs font-extrabold">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm Claim"
                className="flex-1 min-h-[48px] rounded-xl bg-leaf items-center justify-center active:opacity-75"
                onPress={handleConfirmClaim}
              >
                <Text className="text-surface text-xs font-extrabold">Confirm Claim</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
