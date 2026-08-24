// M11: DemandsScreen — Recycler Standing Demand Board & Auto-Match Inbox (SPEC 17)
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { useDemands, useDemandMatches, useCreateDemand, useUpdateMatchStatus, type DemandMatch, type Demand } from '@/hooks/useDemands';
import { StateView } from '@/components/ui/StateView';

export function DemandsScreen({ onOpenNegotiation }: { onOpenNegotiation?: (listingId: string) => void }) {
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'MY_DEMANDS'>('MATCHES');
  const [modalVisible, setModalVisible] = useState(false);

  // Form state for creating demand
  const [category, setCategory] = useState<Category>('METAL');
  const [minQty, setMinQty] = useState('50');
  const [maxQty, setMaxQty] = useState('500');
  const [maxPrice, setMaxPrice] = useState('200');
  const [thana, setThana] = useState('Dhanmondi');
  const [radiusKm, setRadiusKm] = useState('10');

  const { data: demands, isLoading: demandsLoading, refetch: refetchDemands, isRefetching: demandsRefetching } = useDemands();
  const { data: matches, isLoading: matchesLoading, refetch: refetchMatches, isRefetching: matchesRefetching } = useDemandMatches();
  const createDemand = useCreateDemand();
  const updateMatch = useUpdateMatchStatus();

  const handleCreateDemand = async () => {
    await createDemand.mutateAsync({
      category,
      minQuantity: parseFloat(minQty) || 10,
      maxQuantity: maxQty ? parseFloat(maxQty) : undefined,
      unit: category === 'APPLIANCES' || category === 'E_WASTE' ? 'piece' : 'kg',
      maxPricePerUnitBdt: parseFloat(maxPrice) || 50,
      targetThana: thana || undefined,
      maxRadiusKm: parseInt(radiusKm, 10) || 10,
      durationDays: 30,
    });
    setModalVisible(false);
    setActiveTab('MY_DEMANDS');
  };

  const renderMatchCard = ({ item }: { item: DemandMatch }) => {
    return (
      <View className="bg-surface border border-border rounded-[16px] p-[16px] mb-[12px] shadow-sm">
        <View className="flex-row items-center justify-between mb-[8px]">
          <View className="flex-row items-center gap-[6px]">
            <View className="bg-leaf-soft px-[8px] py-[3px] rounded-[6px]">
              <Text className="text-leaf-dark text-[11px] font-bold">{categoryLabel(item.listing.category)}</Text>
            </View>
            <View className="bg-surface-soft px-[8px] py-[3px] rounded-[6px] border border-border">
              <Text className="text-muted text-[11px] font-semibold">{item.listing.thana || 'Dhaka'}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-[4px] bg-amber-50 px-[8px] py-[3px] rounded-[6px] border border-amber-200">
            <Ionicons name="sparkles" size={12} color="#d97706" />
            <Text className="text-amber-800 text-[11px] font-extrabold">{Math.round(parseFloat(item.match_score) * 100)}% Match</Text>
          </View>
        </View>

        <Text className="text-ink text-[16px] font-extrabold mb-[4px]">
          {item.listing.declared_weight ? `${item.listing.declared_weight} kg` : `${item.listing.piece_count} pieces`} Available
        </Text>
        <Text className="text-muted text-[13px] mb-[12px]">
          Asking ৳{item.listing.price_bdt} ({item.listing.declared_condition} condition)
          {item.distance_km ? ` • ${item.distance_km} km away` : ''}
        </Text>

        <View className="flex-row items-center gap-[8px] pt-[8px] border-t border-border">
          <Pressable
            accessibilityRole="button"
            className="flex-1 bg-leaf py-[10px] rounded-[10px] items-center justify-center active:opacity-[0.8]"
            onPress={() => {
              void updateMatch.mutateAsync({ matchId: item.id, status: 'OFFERED' });
              onOpenNegotiation?.(item.listing_id);
            }}
          >
            <Text className="text-white text-[13px] font-extrabold">Make Counter-Offer</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
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
          <Text className="text-leaf text-[11px] font-extrabold tracking-tight">REVERSE DEMAND BOARD</Text>
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
              isEmpty={!matches || matches.length === 0}
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
              isEmpty={!demands || demands.length === 0}
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
    </View>
  );
}
