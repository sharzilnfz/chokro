import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { categoryLabel } from '@/types';
import { useRateCard, type Rate, type RowRate } from '@/hooks/useRateCard';


const RateCardRow = React.memo(function RateCardRow({ item }: { item: RowRate }) {
  return (
    <View
      className="bg-surface border border-border rounded-md p-[16px] mb-[14px] shadow-card"
      style={{ elevation: 2 }}
      accessibilityLabel={`${categoryLabel(item.category)} rates`}
    >
      <Text className="text-ink text-[16px] font-extrabold mb-[6px]">{categoryLabel(item.category)}</Text>
      {item.entries.map((rate) => (
        <View className="flex-row items-center py-[9px]" key={rate.id}>
          <Text className="text-ink text-[14px] font-bold">{categoryLabel(rate.condition_band)}</Text>
          <Text className="text-muted text-[12px] ml-[8px]">per {rate.unit}</Text>
          <Text className="text-leaf-dark text-[16px] font-extrabold ml-auto">৳ {Number(rate.price_bdt).toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );
});

export function RateCardScreen() {
  const { data: rows = [], isLoading, error, refetch, isRefetching } = useRateCard();
  const errorMessage = error ? getErrorMessage(error, 'Could not load the current rate card.') : '';

  const renderItem = useCallback(({ item }: { item: RowRate }) => <RateCardRow item={item} />, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-[28px]" accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.leaf} size="large" />
        <Text className="text-ink text-[18px] font-extrabold text-center mt-[11px]">Loading current rates</Text>
        <Text className="text-muted text-[14px] leading-[20px] text-center mt-[6px]">Only the currently effective published rate is shown per category.</Text>
      </View>
    );
  }

  if (errorMessage && rows.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-[28px]" accessibilityRole="alert">
        <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
        <Text className="text-ink text-[18px] font-extrabold text-center mt-[11px]">Rate card unavailable</Text>
        <Text className="text-muted text-[14px] leading-[20px] text-center mt-[6px]">{errorMessage}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading the rate card"
          className="min-w-[132px] min-h-[48px] rounded-[14px] bg-leaf items-center justify-center mt-[16px] active:opacity-[0.72]"
          onPress={() => void refetch()}
        >
          <Text className="text-surface text-[14px] font-extrabold">Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
      data={rows}
      keyExtractor={(item) => item.category}
      renderItem={renderItem}
      removeClippedSubviews={Platform.OS !== 'web'}
      initialNumToRender={6}
      maxToRenderPerBatch={8}
      windowSize={7}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          colors={[colors.leaf]}
          tintColor={colors.leaf}
        />
      }
      ListHeaderComponent={
        <View>
          <Text className="text-leaf text-[11px] font-extrabold tracking-tight">PUBLISHED MARKET RATES</Text>
          <Text accessibilityRole="header" className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]">Today&apos;s rates</Text>
          <Text className="text-muted text-[14px] leading-[21px] mt-[6px] mb-[18px]">
            Values are per unit — by piece for appliances and e-waste, by kilogram for everything else. The final
            condition and value are confirmed by a person before a listing is matched.
          </Text>
          {errorMessage ? <Text accessibilityRole="alert" className="text-danger bg-danger-soft p-[12px] rounded-[10px] my-[12px] text-[13px] leading-[19px]">{errorMessage}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        <View className="items-center p-[28px] border border-border rounded-md bg-surface">
          <Ionicons name="pricetags-outline" size={31} color={colors.leaf} />
          <Text className="text-ink text-[16px] font-extrabold mt-[9px]">No published rates yet</Text>
          <Text className="text-muted text-[13px] leading-[19px] text-center mt-[5px]">An admin will publish rates once the network is live.</Text>
        </View>
      }
    />
  );
}