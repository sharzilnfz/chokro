import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, getErrorMessage } from '../api';
import { colors } from '../theme';
import { categoryLabel } from '../types';

type Rate = {
  id: string;
  category: string;
  condition_band: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  unit: 'kg' | 'piece';
  price_bdt: string | number;
  effective_from: string;
};

type RowRate = {
  category: string;
  entries: Rate[];
};

function groupRates(rates: Rate[]): RowRate[] {
  const byCategory = new Map<string, Rate[]>();
  for (const rate of rates) {
    const bucket = byCategory.get(rate.category) ?? [];
    bucket.push(rate);
    byCategory.set(rate.category, bucket);
  }
  return Array.from(byCategory.entries()).map(([category, entries]) => ({
    category,
    entries: entries.sort(
      (a, b) => conditionOrder(a.condition_band) - conditionOrder(b.condition_band),
    ),
  }));
}

function conditionOrder(condition: Rate['condition_band']) {
  return ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'].indexOf(condition);
}

export function RateCardScreen({ token }: { token: string }) {
  const [rows, setRows] = useState<RowRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadRates = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        const data = await apiRequest<{ rates: Rate[] }>('/api/rate-card/published', { token });
        setRows(groupRates(Array.isArray(data.rates) ? data.rates : []));
      } catch (nextError) {
        setError(getErrorMessage(nextError, 'Could not load the current rate card.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-[28px]" accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.leaf} size="large" />
        <Text className="text-ink text-[18px] font-extrabold text-center mt-[11px]">Loading current rates</Text>
        <Text className="text-muted text-[14px] leading-[20px] text-center mt-[6px]">Only the currently effective published rate is shown per category.</Text>
      </View>
    );
  }

  if (error && rows.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-[28px]" accessibilityRole="alert">
        <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
        <Text className="text-ink text-[18px] font-extrabold text-center mt-[11px]">Rate card unavailable</Text>
        <Text className="text-muted text-[14px] leading-[20px] text-center mt-[6px]">{error}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading the rate card"
          className="min-w-[132px] min-h-[48px] rounded-[14px] bg-leaf items-center justify-center mt-[16px] active:opacity-[0.72]"
          onPress={() => void loadRates()}
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadRates(true)}
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
          {error ? <Text accessibilityRole="alert" className="text-danger bg-danger-soft p-[12px] rounded-[10px] my-[12px] text-[13px] leading-[19px]">{error}</Text> : null}
        </View>
      }
      renderItem={({ item }) => (
        <View className="bg-surface border border-border rounded-md p-[16px] mb-[14px] shadow-card" style={{ elevation: 2 }} accessibilityLabel={`${categoryLabel(item.category)} rates`}>
          <Text className="text-ink text-[16px] font-extrabold mb-[6px]">{categoryLabel(item.category)}</Text>
          {item.entries.map((rate) => (
            <View className="flex-row items-center py-[9px]" key={rate.id}>
              <Text className="text-ink text-[14px] font-bold">{categoryLabel(rate.condition_band)}</Text>
              <Text className="text-muted text-[12px] ml-[8px]">per {rate.unit}</Text>
              <Text className="text-leaf-dark text-[16px] font-extrabold ml-auto">৳ {Number(rate.price_bdt).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}
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