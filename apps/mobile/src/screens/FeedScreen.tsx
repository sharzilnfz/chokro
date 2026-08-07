import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, getErrorMessage } from '@/api';
import { colors } from '@/theme';
import { CATEGORIES, CONDITIONS, categoryLabel, type Category, type Condition, type ListingStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';

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

const FEED_CATEGORIES: FeedFilter[] = ['ALL', ...CATEGORIES];
const FEED_CONDITIONS: ConditionFilter[] = ['ALL', ...CONDITIONS];

function ListingCard({ item }: { item: Listing }) {
  const quantity = item.unit === 'piece'
    ? item.piece_count ?? item.declared_weight
    : item.declared_weight;
  const quantityText = item.unit === 'piece'
    ? `${quantity ?? 'Not stated'} ${Number(quantity) === 1 ? 'piece' : 'pieces'}`
    : `${quantity ?? 'Not stated'} kg`;
  const photo = item.photos?.[0];

  return (
    <View
      className="bg-surface rounded-md border border-border overflow-hidden mt-[10px] shadow-card"
      style={{ elevation: 2 }}
      accessibilityLabel={`${categoryLabel(item.category)}, ${categoryLabel(item.declared_condition)}, ${quantityText}, status ${categoryLabel(item.status)}`}
    >
      {photo ? (
        <Image
          source={{ uri: photo }}
          className="w-full h-[178px] bg-surface-muted"
          resizeMode="cover"
          accessibilityLabel={`${categoryLabel(item.category)} listing photo`}
        />
      ) : (
        <View className="h-[130px] bg-surface-muted items-center justify-center gap-[5px]">
          <Ionicons name="image-outline" size={28} color={colors.muted} />
          <Text className="text-muted text-[12px] font-semibold">No photo available</Text>
        </View>
      )}
      <View className="p-[16px]">
        <View className="flex-row items-center justify-between gap-[10px]">
          <Text className="flex-1 text-ink text-[20px] font-extrabold tracking-tight">{categoryLabel(item.category)}</Text>
          <View className="min-h-[30px] flex-row items-center gap-[6px] bg-leaf-soft rounded-pill px-[10px]">
            <View className="w-[7px] h-[7px] rounded-[4px] bg-leaf" />
            <Text className="text-leaf-dark text-[11px] font-extrabold">{categoryLabel(item.status)}</Text>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-[14px] mt-[12px]">
          <View className="min-h-[28px] flex-row items-center gap-[6px]">
            <Ionicons name="layers-outline" size={16} color={colors.muted} />
            <Text className="text-muted text-[13px] font-bold">{quantityText}</Text>
          </View>
          <View className="min-h-[28px] flex-row items-center gap-[6px]">
            <Ionicons name="sparkles-outline" size={16} color={colors.muted} />
            <Text className="text-muted text-[13px] font-bold">{categoryLabel(item.declared_condition)}</Text>
          </View>
        </View>
        <Text className="text-muted text-[12px] leading-[18px] border-t border-border mt-[12px] pt-[11px]">
          Owner-declared details. Final condition and value are confirmed at handover.
        </Text>
      </View>
    </View>
  );
}

export function FeedScreen() {
  const { token } = useAuth();
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

  const renderCard = ({ item }: { item: Listing }) => <ListingCard item={item} />;

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={[{ padding: 20, paddingBottom: 32 }, items.length === 0 && { flexGrow: 1 }]}
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
            <Text className="text-leaf text-[11px] font-extrabold tracking-tight">COMMUNITY CIRCULATION</Text>
            <Text accessibilityRole="header" className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]">Browse</Text>
            <Text className="text-muted text-[14px] leading-[21px] mt-[6px] mb-[18px]">Active listings from people giving useful things another turn.</Text>

            <Text className="text-ink text-[12px] font-extrabold mb-[7px]">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 13 }}>
              {FEED_CATEGORIES.map((item) => {
                const selected = category === item;
                const label = item === 'ALL' ? 'All' : categoryLabel(item);
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityLabel={`${label} category`}
                    accessibilityState={{ checked: selected }}
                    className={`min-h-[48px] px-[14px] rounded-pill border items-center justify-center active:opacity-[0.72] ${selected ? 'border-leaf bg-leaf-soft' : 'border-border bg-surface'}`}
                    onPress={() => setCategory(item)}
                  >
                    <Text className={`text-[13px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text className="text-ink text-[12px] font-extrabold mb-[7px]">Condition</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 13 }}>
              {FEED_CONDITIONS.map((item) => {
                const selected = condition === item;
                const label = item === 'ALL' ? 'Any condition' : categoryLabel(item);
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityLabel={label}
                    accessibilityState={{ checked: selected }}
                    className={`min-h-[48px] px-[14px] rounded-pill border items-center justify-center active:opacity-[0.72] ${selected ? 'border-leaf bg-leaf-soft' : 'border-border bg-surface'}`}
                    onPress={() => setCondition(item)}
                  >
                    <Text className={`text-[13px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View className="flex-1 min-h-[240px] items-center justify-center px-[22px] py-[34px]" accessibilityLiveRegion="polite">
              <ActivityIndicator color={colors.leaf} size="large" />
              <Text className="text-ink text-[18px] font-extrabold text-center mt-[10px]">Loading active listings</Text>
            </View>
          ) : error ? (
            <View className="flex-1 min-h-[240px] items-center justify-center px-[22px] py-[34px]" accessibilityRole="alert">
              <Ionicons name="cloud-offline-outline" size={31} color={colors.danger} />
              <Text className="text-ink text-[18px] font-extrabold text-center mt-[10px]">Browse is unavailable</Text>
              <Text className="text-muted text-[14px] leading-[20px] text-center mt-[6px]">{error}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry loading listings"
                className="min-w-[132px] min-h-[48px] rounded-[14px] bg-leaf items-center justify-center mt-[16px] active:opacity-[0.72]"
                onPress={() => void loadFeed('initial')}
              >
                <Text className="text-surface text-[14px] font-extrabold">Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-1 min-h-[240px] items-center justify-center px-[22px] py-[34px]">
              <Ionicons name="leaf-outline" size={32} color={colors.leaf} />
              <Text className="text-ink text-[18px] font-extrabold text-center mt-[10px]">No listings found</Text>
              <Text className="text-muted text-[14px] leading-[20px] text-center mt-[6px]">Try another category or condition, or pull down to refresh.</Text>
            </View>
          )
        }
        ListFooterComponent={
          items.length > 0 ? (
            <View className="items-center pt-[18px] pb-[4px]">
              {error ? <Text accessibilityRole="alert" className="text-danger text-center text-[13px] leading-[19px] mb-[8px]">{error}</Text> : null}
              {nextCursor ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Load more listings"
                  accessibilityState={{ disabled: loadingMore, busy: loadingMore }}
                  className={`min-w-[150px] min-h-[48px] border border-leaf rounded-[14px] items-center justify-center bg-surface active:opacity-[0.72] ${loadingMore ? 'opacity-[0.55]' : ''}`}
                  disabled={loadingMore}
                  onPress={() => void loadFeed('more')}
                >
                  {loadingMore ? <ActivityIndicator color={colors.leaf} /> : <Text className="text-leaf-dark text-[14px] font-extrabold">Load more</Text>}
                </Pressable>
              ) : (
                <Text className="text-muted text-[12px]">You have reached the end of this feed.</Text>
              )}
            </View>
          ) : null
        }
      />
    </View>
  );
}
