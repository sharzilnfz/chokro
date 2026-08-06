import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, getErrorMessage } from '../api';
import { colors, radii, shadows } from '../theme';
import { CATEGORIES, CONDITIONS, categoryLabel, type Category, type Condition, type ListingStatus } from '../types';

type FeedFilter = 'ALL' | Category;
type ConditionFilter = 'ALL' | Condition;

type Listing = {
  id: string;
  category: Category;
  unit: 'kg' | 'piece';
  declared_weight?: string | number | null;
  piece_count?: string | number | null;
  declared_condition: Condition;
  photos?: string[];
  status: ListingStatus;
  created_at?: string;
};

type FeedResponse = {
  items: Listing[];
  nextCursor?: string | null;
};

export function FeedScreen({ token }: { token: string }) {
  const [category, setCategory] = useState<FeedFilter>('ALL');
  const [condition, setCondition] = useState<ConditionFilter>('ALL');
  const [items, setItems] = useState<Listing[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);

  const buildPath = (cursor?: string | null) => {
    const params = new URLSearchParams({ limit: '20' });
    if (category !== 'ALL') params.set('category', category);
    if (condition !== 'ALL') params.set('condition', condition);
    if (cursor) params.set('cursor', cursor);
    return `/api/feed?${params.toString()}`;
  };

  const loadFeed = async (mode: 'initial' | 'refresh' | 'more' = 'initial') => {
    if (mode === 'more' && (!nextCursor || loadingMore)) return;
    const version = mode === 'more' ? requestVersion.current : ++requestVersion.current;
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'more') setLoadingMore(true);
    setError('');

    try {
      const requestedCursor = mode === 'more' ? nextCursor : null;
      const data = await apiRequest<FeedResponse>(buildPath(requestedCursor), { token });
      if (version !== requestVersion.current) return;
      const nextItems = Array.isArray(data.items) ? data.items : [];

      if (mode === 'more') {
        const existingIds = new Set(items.map((item) => item.id));
        const uniqueItems = nextItems.filter((item) => !existingIds.has(item.id));
        setItems((current) => [...current, ...uniqueItems]);
        setNextCursor(uniqueItems.length > 0 && data.nextCursor !== requestedCursor ? data.nextCursor ?? null : null);
      } else {
        setItems(nextItems);
        setNextCursor(data.nextCursor ?? null);
      }
    } catch (nextError) {
      if (version !== requestVersion.current) return;
      setError(getErrorMessage(nextError, 'Could not load listings.'));
      if (mode !== 'more') setItems([]);
    } finally {
      if (version !== requestVersion.current) return;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setNextCursor(null);
    void loadFeed('initial');
  }, [category, condition]);

  const renderCard = ({ item }: { item: Listing }) => {
    const quantity = item.unit === 'piece'
      ? item.piece_count ?? item.declared_weight
      : item.declared_weight;
    const quantityText = item.unit === 'piece'
      ? `${quantity ?? 'Not stated'} ${Number(quantity) === 1 ? 'piece' : 'pieces'}`
      : `${quantity ?? 'Not stated'} kg`;
    const photo = item.photos?.[0];

    return (
      <View style={styles.card} accessibilityLabel={`${categoryLabel(item.category)}, ${categoryLabel(item.declared_condition)}, ${quantityText}, status ${categoryLabel(item.status)}`}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.cardImage} accessibilityLabel={`${categoryLabel(item.category)} listing photo`} />
        ) : (
          <View style={styles.photoFallback}>
            <Ionicons name="image-outline" size={28} color={colors.muted} />
            <Text style={styles.photoFallbackText}>No photo available</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardTopline}>
            <Text style={styles.category}>{categoryLabel(item.category)}</Text>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>{categoryLabel(item.status)}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="layers-outline" size={16} color={colors.muted} />
              <Text style={styles.metaText}>{quantityText}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="sparkles-outline" size={16} color={colors.muted} />
              <Text style={styles.metaText}>{categoryLabel(item.declared_condition)}</Text>
            </View>
          </View>
          <Text style={styles.honestyNote}>Owner-declared details. Final condition and value are confirmed at handover.</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={[styles.listContent, items.length === 0 && styles.emptyContent]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadFeed('refresh')}
            colors={[colors.leaf]}
            tintColor={colors.leaf}
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.eyebrow}>COMMUNITY CIRCULATION</Text>
            <Text accessibilityRole="header" style={styles.title}>Browse</Text>
            <Text style={styles.subtitle}>Active listings from people giving useful things another turn.</Text>

            <Text style={styles.filterLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['ALL', ...CATEGORIES] as FeedFilter[]).map((item) => {
                const selected = category === item;
                const label = item === 'ALL' ? 'All' : categoryLabel(item);
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityLabel={`${label} category`}
                    accessibilityState={{ checked: selected }}
                    style={({ pressed }) => [styles.chip, selected && styles.chipActive, pressed && styles.pressed]}
                    onPress={() => setCategory(item)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.filterLabel}>Condition</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['ALL', ...CONDITIONS] as ConditionFilter[]).map((item) => {
                const selected = condition === item;
                const label = item === 'ALL' ? 'Any condition' : categoryLabel(item);
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityLabel={label}
                    accessibilityState={{ checked: selected }}
                    style={({ pressed }) => [styles.chip, selected && styles.chipActive, pressed && styles.pressed]}
                    onPress={() => setCondition(item)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBox} accessibilityLiveRegion="polite">
              <ActivityIndicator color={colors.leaf} size="large" />
              <Text style={styles.stateTitle}>Loading active listings</Text>
            </View>
          ) : error ? (
            <View style={styles.stateBox} accessibilityRole="alert">
              <Ionicons name="cloud-offline-outline" size={31} color={colors.danger} />
              <Text style={styles.stateTitle}>Browse is unavailable</Text>
              <Text style={styles.stateCopy}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry loading listings"
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
                onPress={() => void loadFeed('initial')}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.stateBox}>
              <Ionicons name="leaf-outline" size={32} color={colors.leaf} />
              <Text style={styles.stateTitle}>No listings found</Text>
              <Text style={styles.stateCopy}>Try another category or condition, or pull down to refresh.</Text>
            </View>
          )
        }
        ListFooterComponent={
          items.length > 0 ? (
            <View style={styles.footer}>
              {error ? <Text accessibilityRole="alert" style={styles.paginationError}>{error}</Text> : null}
              {nextCursor ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Load more listings"
                  accessibilityState={{ disabled: loadingMore, busy: loadingMore }}
                  style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressed, loadingMore && styles.disabled]}
                  disabled={loadingMore}
                  onPress={() => void loadFeed('more')}
                >
                  {loadingMore ? <ActivityIndicator color={colors.leaf} /> : <Text style={styles.loadMoreText}>Load more</Text>}
                </Pressable>
              ) : (
                <Text style={styles.endText}>You have reached the end of this feed.</Text>
              )}
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: 20, paddingBottom: 32 },
  emptyContent: { flexGrow: 1 },
  eyebrow: { color: colors.leaf, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 31, lineHeight: 37, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 18 },
  filterLabel: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 7 },
  filterRow: { gap: 8, paddingBottom: 13 },
  chip: { minHeight: 48, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  chipActive: { borderColor: colors.leaf, backgroundColor: colors.leafSoft },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: colors.leafDark },
  card: { backgroundColor: colors.surface, borderRadius: radii.medium, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginTop: 10, ...shadows.card },
  cardImage: { width: '100%', height: 178, resizeMode: 'cover', backgroundColor: colors.surfaceMuted },
  photoFallback: { height: 130, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', gap: 5 },
  photoFallbackText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  cardBody: { padding: 16 },
  cardTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  category: { flex: 1, color: colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  activeBadge: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.leafSoft, borderRadius: radii.pill, paddingHorizontal: 10 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.leaf },
  activeText: { color: colors.leafDark, fontSize: 11, fontWeight: '800' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  metaItem: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  honestyNote: { color: colors.muted, fontSize: 12, lineHeight: 18, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 11 },
  stateBox: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 34 },
  stateTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  stateCopy: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  retryButton: { minWidth: 132, minHeight: 48, borderRadius: 14, backgroundColor: colors.leaf, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  retryText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
  footer: { alignItems: 'center', paddingTop: 18, paddingBottom: 4 },
  paginationError: { color: colors.danger, textAlign: 'center', fontSize: 13, lineHeight: 19, marginBottom: 8 },
  loadMoreButton: { minWidth: 150, minHeight: 48, borderWidth: 1, borderColor: colors.leaf, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  loadMoreText: { color: colors.leafDark, fontSize: 14, fontWeight: '800' },
  endText: { color: colors.muted, fontSize: 12 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.72 },
});
