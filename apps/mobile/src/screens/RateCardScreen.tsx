import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, getErrorMessage } from '../api';
import { colors, radii, shadows } from '../theme';
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
      <View style={styles.centered} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.leaf} size="large" />
        <Text style={styles.stateTitle}>Loading current rates</Text>
        <Text style={styles.stateCopy}>Only the currently effective published rate is shown per category.</Text>
      </View>
    );
  }

  if (error && rows.length === 0) {
    return (
      <View style={styles.centered} accessibilityRole="alert">
        <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
        <Text style={styles.stateTitle}>Rate card unavailable</Text>
        <Text style={styles.stateCopy}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading the rate card"
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          onPress={() => void loadRates()}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
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
          <Text style={styles.eyebrow}>PUBLISHED MARKET RATES</Text>
          <Text accessibilityRole="header" style={styles.title}>Today&apos;s rates</Text>
          <Text style={styles.subtitle}>
            Values are per unit — by piece for appliances and e-waste, by kilogram for everything else. The final
            condition and value are confirmed by a person before a listing is matched.
          </Text>
          {error ? <Text accessibilityRole="alert" style={styles.inlineError}>{error}</Text> : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.group} accessibilityLabel={`${categoryLabel(item.category)} rates`}>
          <Text style={styles.category}>{categoryLabel(item.category)}</Text>
          {item.entries.map((rate) => (
            <View style={styles.row} key={rate.id}>
              <Text style={styles.condition}>{categoryLabel(rate.condition_band)}</Text>
              <Text style={styles.unit}>per {rate.unit}</Text>
              <Text style={styles.price}>৳ {Number(rate.price_bdt).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Ionicons name="pricetags-outline" size={31} color={colors.leaf} />
          <Text style={styles.emptyTitle}>No published rates yet</Text>
          <Text style={styles.emptyCopy}>An admin will publish rates once the network is live.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 28 },
  eyebrow: { color: colors.leaf, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 31, lineHeight: 37, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 18 },
  inlineError: { color: colors.danger, backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 10, marginVertical: 12, fontSize: 13, lineHeight: 19 },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    padding: 16,
    marginBottom: 14,
    ...shadows.card,
  },
  category: { color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  condition: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  unit: { color: colors.muted, fontSize: 12, marginLeft: 8 },
  price: { color: colors.leafDark, fontSize: 16, fontWeight: '800', marginLeft: 'auto' },
  emptyBox: { alignItems: 'center', padding: 28, borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, backgroundColor: colors.surface },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 9 },
  emptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5 },
  stateTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 11 },
  stateCopy: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  retryButton: { minWidth: 132, minHeight: 48, borderRadius: 14, backgroundColor: colors.leaf, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  retryText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});