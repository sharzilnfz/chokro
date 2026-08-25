// M11: DemandsScreen — Recycler Standing Demand Board & Auto-Match Inbox (SPEC 17)
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { CATEGORIES, categoryLabel, type Category } from '@/types';
import {
  useDemands,
  useDemandMatches,
  useCreateDemand,
  useUpdateMatchStatus,
  type DemandMatch,
  type Demand,
} from '@/hooks/useDemands';
import { useCreateNegotiationThread } from '@/hooks/useNegotiations';
import { StateView } from '@/components/ui/StateView';
import { getErrorMessage } from '@/services/api';

export function DemandsScreen({
  onBack,
  onOpenNegotiation,
}: {
  onBack?: () => void;
  onOpenNegotiation?: (threadId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'MY_DEMANDS'>('MATCHES');
  const [modalVisible, setModalVisible] = useState(false);

  // Form state for creating demand
  const [category, setCategory] = useState<Category>('METAL');
  const [minQty, setMinQty] = useState('50');
  const [maxQty, setMaxQty] = useState('500');
  const [maxPrice, setMaxPrice] = useState('200');
  const [thana, setThana] = useState('Dhanmondi');
  const [radiusKm, setRadiusKm] = useState('10');

  // Counter-offer state for matched listings
  const [selectedMatch, setSelectedMatch] = useState<DemandMatch | null>(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerQty, setOfferQty] = useState('');
  const [offerNotes, setOfferNotes] = useState('');

  const {
    data: demands,
    isLoading: demandsLoading,
    error: demandsError,
    refetch: refetchDemands,
    isRefetching: demandsRefetching,
  } = useDemands();

  const {
    data: matches,
    isLoading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
    isRefetching: matchesRefetching,
  } = useDemandMatches();

  const createDemand = useCreateDemand();
  const updateMatch = useUpdateMatchStatus();
  const createThread = useCreateNegotiationThread();

  const handleCreateDemand = async () => {
    const minQ = parseFloat(minQty);
    const maxP = parseFloat(maxPrice);
    if (!minQ || minQ <= 0 || !maxP || maxP <= 0) {
      Alert.alert('Invalid Input', 'Please enter positive values for quantity and maximum unit price.');
      return;
    }

    try {
      await createDemand.mutateAsync({
        category,
        minQuantity: minQ,
        maxQuantity: maxQty ? parseFloat(maxQty) : undefined,
        unit: category === 'APPLIANCES' || category === 'E_WASTE' ? 'piece' : 'kg',
        maxPricePerUnitBdt: maxP,
        targetThana: thana.trim() || undefined,
        maxRadiusKm: parseInt(radiusKm, 10) || 10,
        durationDays: 30,
      });
      setModalVisible(false);
      setActiveTab('MY_DEMANDS');
      Alert.alert('Demand Published', 'Your standing demand is active and matching incoming listings.');
    } catch (err) {
      Alert.alert('Publish Failed', getErrorMessage(err, 'Could not create demand.'));
    }
  };

  const openCounterModal = (item: DemandMatch) => {
    setSelectedMatch(item);
    const initialPrice = item.listing?.price_bdt || String(item.demand?.max_price_per_unit_bdt || '100');
    const initialQty = item.listing?.declared_weight
      ? String(item.listing.declared_weight)
      : item.listing?.piece_count
      ? String(item.listing.piece_count)
      : String(item.demand?.min_quantity || '10');

    setOfferPrice(initialPrice);
    setOfferQty(initialQty);
    setOfferNotes('');
  };

  const handleSendOffer = async () => {
    if (!selectedMatch) return;
    const price = parseFloat(offerPrice);
    const qty = parseFloat(offerQty);

    if (!price || price <= 0 || !qty || qty <= 0) {
      Alert.alert('Invalid Values', 'Please enter a valid offer amount and quantity.');
      return;
    }

    try {
      const res = await createThread.mutateAsync({
        listingId: selectedMatch.listing_id,
        initialOfferAmountBdt: price,
        offeredQuantity: qty,
        unit: selectedMatch.listing?.unit || 'kg',
        notes: offerNotes.trim() || undefined,
      });

      await updateMatch.mutateAsync({ matchId: selectedMatch.id, status: 'OFFERED' });
      setSelectedMatch(null);

      if (res?.thread?.id && onOpenNegotiation) {
        onOpenNegotiation(res.thread.id);
      } else {
        Alert.alert('Counter-Offer Sent', 'Your binding offer has been sent to the seller.');
      }
    } catch (err) {
      Alert.alert('Offer Failed', getErrorMessage(err, 'Could not send counter-offer.'));
    }
  };

  const renderMatchCard = ({ item }: { item: DemandMatch }) => {
    const matchPercentage = Math.round(parseFloat(String(item.match_score || 0)) * 100);
    const listingCategory = item.listing?.category || item.demand?.category || 'METAL';
    const quantityDisplay = item.listing?.declared_weight
      ? `${item.listing.declared_weight} kg`
      : item.listing?.piece_count
      ? `${item.listing.piece_count} pieces`
      : 'Material';

    return (
      <View className="bg-surface border border-border rounded-[16px] p-[16px] mb-[12px] shadow-sm">
        <View className="flex-row items-center justify-between mb-[8px]">
          <View className="flex-row items-center gap-[6px]">
            <View className="bg-leaf-soft px-[8px] py-[3px] rounded-[6px]">
              <Text className="text-leaf-dark text-[11px] font-bold">{categoryLabel(listingCategory)}</Text>
            </View>
            <View className="bg-surface-soft px-[8px] py-[3px] rounded-[6px] border border-border">
              <Text className="text-muted text-[11px] font-semibold">{item.listing?.thana || 'Dhaka'}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-[4px] bg-amber-50 px-[8px] py-[3px] rounded-[6px] border border-amber-200">
            <Ionicons name="sparkles" size={12} color="#d97706" />
            <Text className="text-amber-800 text-[11px] font-extrabold">{matchPercentage}% Match</Text>
          </View>
        </View>

        <Text className="text-ink text-[16px] font-extrabold mb-[4px]">
          {quantityDisplay} Available
        </Text>
        <Text className="text-muted text-[13px] mb-[12px]">
          Asking ৳{item.listing?.price_bdt ?? '0'} ({item.listing?.declared_condition ?? 'Good'} condition)
          {item.distance_km ? ` • ${item.distance_km} km away` : ''}
        </Text>

        <View className="flex-row items-center gap-[8px] pt-[8px] border-t border-border">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Make Counter-Offer"
            className="flex-1 bg-leaf py-[10px] rounded-[10px] items-center justify-center active:opacity-[0.8]"
            onPress={() => openCounterModal(item)}
          >
            <Text className="text-white text-[13px] font-extrabold">Make Counter-Offer</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pass match"
            className="px-[14px] py-[10px] rounded-[10px] border border-border items-center justify-center bg-surface active:opacity-[0.8]"
            onPress={() => {
              void updateMatch.mutateAsync({ matchId: item.id, status: 'DECLINED' });
            }}
          >
            <Text className="text-muted text-[13px] font-semibold">Pass</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderDemandCard = ({ item }: { item: Demand }) => {
    return (
      <View className="bg-surface border border-border rounded-[16px] p-[16px] mb-[12px] shadow-sm">
        <View className="flex-row items-center justify-between mb-[6px]">
          <View className="bg-leaf-soft px-[8px] py-[3px] rounded-[6px]">
            <Text className="text-leaf-dark text-[11px] font-bold">{categoryLabel(item.category)}</Text>
          </View>
          <Text className={`text-[11px] font-extrabold ${item.status === 'ACTIVE' ? 'text-leaf' : 'text-muted'}`}>
            {item.status}
          </Text>
        </View>
        <Text className="text-ink text-[16px] font-extrabold mb-[4px]">
          Target: {item.min_quantity} - {item.max_quantity || '∞'} {item.unit}
        </Text>
        <Text className="text-muted text-[13px]">
          Max Price: ৳{item.max_price_per_unit_bdt}/{item.unit} • {item.target_thana || 'Any Thana'} (within {item.max_radius_km}km)
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-[20px] pt-[20px] pb-[12px]">
        <View className="flex-row items-center justify-between mb-[4px]">
          <View className="flex-row items-center gap-2">
            {onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={8}
                className="w-8 h-8 items-center justify-center rounded-full bg-surface border border-border mr-1 active:opacity-[0.7]"
                onPress={onBack}
              >
                <Ionicons name="arrow-back" size={18} color={colors.ink} />
              </Pressable>
            ) : null}
            <Text className="text-leaf text-[11px] font-extrabold tracking-tight">REVERSE DEMAND BOARD</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            className="bg-leaf flex-row items-center gap-[4px] px-[12px] py-[6px] rounded-pill active:opacity-[0.8]"
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-white text-[12px] font-extrabold">Post Demand</Text>
          </Pressable>
        </View>
        <Text className="text-ink text-[28px] font-extrabold tracking-tight">Recycler Desk</Text>
        <Text className="text-muted text-[13px] mt-[2px]">Post standing material requirements and receive instant matches.</Text>

        {/* Tab Switcher */}
        <View className="flex-row bg-surface-soft p-[4px] rounded-[12px] mt-[14px] border border-border">
          <Pressable
            className={`flex-1 py-[8px] items-center rounded-[8px] ${activeTab === 'MATCHES' ? 'bg-surface shadow-xs' : ''}`}
            onPress={() => setActiveTab('MATCHES')}
          >
            <Text className={`text-[13px] font-bold ${activeTab === 'MATCHES' ? 'text-leaf-dark' : 'text-muted'}`}>
              Matched Listings ({matches?.length ?? 0})
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 py-[8px] items-center rounded-[8px] ${activeTab === 'MY_DEMANDS' ? 'bg-surface shadow-xs' : ''}`}
            onPress={() => setActiveTab('MY_DEMANDS')}
          >
            <Text className={`text-[13px] font-bold ${activeTab === 'MY_DEMANDS' ? 'text-leaf-dark' : 'text-muted'}`}>
              My Demands ({demands?.length ?? 0})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      {activeTab === 'MATCHES' ? (
        <FlatList
          data={matches ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderMatchCard}
          contentContainerStyle={{ padding: 20, paddingTop: 6, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={matchesRefetching}
              onRefresh={() => void refetchMatches()}
              colors={[colors.leaf]}
              tintColor={colors.leaf}
            />
          }
          ListEmptyComponent={
            <StateView
              isLoading={matchesLoading}
              loadingTitle="Finding matching listings"
              error={matchesError ? getErrorMessage(matchesError, 'Could not load matches.') : null}
              errorTitle="Matches unavailable"
              onRetry={() => void refetchMatches()}
              isEmpty={!matchesLoading && !matchesError && (!matches || matches.length === 0)}
              emptyIcon="file-tray-outline"
              emptyTitle="No matches yet"
              emptyMessage="Post a standing demand to automatically match new scrap listings in your target zone."
              containerClassName="flex-1 min-h-[220px] py-[30px]"
            />
          }
        />
      ) : (
        <FlatList
          data={demands ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderDemandCard}
          contentContainerStyle={{ padding: 20, paddingTop: 6, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={demandsRefetching}
              onRefresh={() => void refetchDemands()}
              colors={[colors.leaf]}
              tintColor={colors.leaf}
            />
          }
          ListEmptyComponent={
            <StateView
              isLoading={demandsLoading}
              loadingTitle="Loading your demands"
              error={demandsError ? getErrorMessage(demandsError, 'Could not load demands.') : null}
              errorTitle="Demands unavailable"
              onRetry={() => void refetchDemands()}
              isEmpty={!demandsLoading && !demandsError && (!demands || demands.length === 0)}
              emptyIcon="megaphone-outline"
              emptyTitle="No active demands"
              emptyMessage="Create a demand specifying scrap category, target price, and Thana."
              containerClassName="flex-1 min-h-[220px] py-[30px]"
            />
          }
        />
      )}

      {/* Create Demand Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface rounded-t-[24px] p-[24px] max-h-[85%]">
            <View className="flex-row items-center justify-between mb-[16px]">
              <Text className="text-ink text-[20px] font-extrabold">Post Standing Demand</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-ink text-[12px] font-bold mb-[6px]">Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 12 }}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    className={`px-[12px] py-[8px] rounded-pill border ${category === cat ? 'border-leaf bg-leaf-soft' : 'border-border bg-surface'}`}
                    onPress={() => setCategory(cat)}
                  >
                    <Text className={`text-[12px] font-bold ${category === cat ? 'text-leaf-dark' : 'text-muted'}`}>
                      {categoryLabel(cat)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text className="text-ink text-[12px] font-bold mb-[4px]">Min Quantity ({category === 'APPLIANCES' || category === 'E_WASTE' ? 'pieces' : 'kg'})</Text>
              <TextInput
                value={minQty}
                onChangeText={setMinQty}
                keyboardType="numeric"
                className="bg-surface-soft border border-border rounded-[10px] px-[12px] py-[10px] text-ink font-bold mb-[12px]"
              />

              <Text className="text-ink text-[12px] font-bold mb-[4px]">Max Quantity (Optional)</Text>
              <TextInput
                value={maxQty}
                onChangeText={setMaxQty}
                keyboardType="numeric"
                placeholder="Unlimited"
                className="bg-surface-soft border border-border rounded-[10px] px-[12px] py-[10px] text-ink font-bold mb-[12px]"
              />

              <Text className="text-ink text-[12px] font-bold mb-[4px]">Max Price per Unit (BDT)</Text>
              <TextInput
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="numeric"
                className="bg-surface-soft border border-border rounded-[10px] px-[12px] py-[10px] text-ink font-bold mb-[12px]"
              />

              <Text className="text-ink text-[12px] font-bold mb-[4px]">Target Thana</Text>
              <TextInput
                value={thana}
                onChangeText={setThana}
                className="bg-surface-soft border border-border rounded-[10px] px-[12px] py-[10px] text-ink font-bold mb-[12px]"
              />

              <Text className="text-ink text-[12px] font-bold mb-[4px]">Max Radius (km)</Text>
              <TextInput
                value={radiusKm}
                onChangeText={setRadiusKm}
                keyboardType="numeric"
                className="bg-surface-soft border border-border rounded-[10px] px-[12px] py-[10px] text-ink font-bold mb-[12px]"
              />

              <Pressable
                className="bg-leaf py-[14px] rounded-[12px] items-center justify-center mt-[12px] active:opacity-[0.8]"
                disabled={createDemand.isPending}
                onPress={() => void handleCreateDemand()}
              >
                {createDemand.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-[15px] font-extrabold">Publish Standing Demand</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Counter Offer Modal */}
      <Modal visible={selectedMatch !== null} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface rounded-t-[24px] p-[24px] max-h-[85%]">
            <View className="flex-row items-center justify-between mb-[16px]">
              <Text className="text-ink text-[20px] font-extrabold">Make Counter-Offer</Text>
              <Pressable onPress={() => setSelectedMatch(null)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-muted text-[13px] mb-[14px]">
                Submit a binding offer to the seller. If accepted, a pickup order is automatically scheduled.
              </Text>

              <Text className="text-ink text-[12px] font-bold mb-[4px]">Offer Amount (BDT total)</Text>
              <TextInput
                value={offerPrice}
                onChangeText={setOfferPrice}
                keyboardType="numeric"
                className="bg-surface-soft border border-border rounded-[10px] px-[12px] py-[10px] text-ink font-bold mb-[12px]"
              />

              <Text className="text-ink text-[12px] font-bold mb-[4px]">Quantity ({selectedMatch?.listing?.unit || 'kg'})</Text>
              <TextInput
                value={offerQty}
                onChangeText={setOfferQty}
                keyboardType="numeric"
                className="bg-surface-soft border border-border rounded-[10px] px-[12px] py-[10px] text-ink font-bold mb-[12px]"
              />

              <Text className="text-ink text-[12px] font-bold mb-[4px]">Notes to Seller (Optional)</Text>
              <TextInput
                value={offerNotes}
                onChangeText={setOfferNotes}
                placeholder="e.g. Ready for pickup tomorrow morning"
                className="bg-surface-soft border border-border rounded-[10px] px-[12px] py-[10px] text-ink mb-[16px]"
              />

              <Pressable
                className="bg-leaf py-[14px] rounded-[12px] items-center justify-center active:opacity-[0.8]"
                disabled={createThread.isPending || updateMatch.isPending}
                onPress={() => void handleSendOffer()}
              >
                {createThread.isPending || updateMatch.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-[15px] font-extrabold">Submit Binding Offer</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
