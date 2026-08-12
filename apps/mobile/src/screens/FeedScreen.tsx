import React, { useState } from 'react';
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
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { CATEGORIES, CONDITIONS, categoryLabel, formatQuantityWithUnit, type Category, type Condition } from '@/types';
import { StateView } from '@/components/ui/StateView';
import { useFeed, type Listing } from '@/hooks/useFeed';

type FeedFilter = 'ALL' | Category;
type ConditionFilter = 'ALL' | Condition;


const FEED_CATEGORIES: FeedFilter[] = ['ALL', ...CATEGORIES];
const FEED_CONDITIONS: ConditionFilter[] = ['ALL', ...CONDITIONS];

function ListingCard({ item }: { item: Listing }) {
  const quantity = item.unit === 'piece'
    ? item.piece_count ?? item.declared_weight
    : item.declared_weight;
  const quantityText = formatQuantityWithUnit(item.unit, quantity);
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
  const [category, setCategory] = useState<FeedFilter>('ALL');
  const [condition, setCondition] = useState<ConditionFilter>('ALL');

  const { data, isLoading, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed(category, condition);
  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const errorMessage = error ? getErrorMessage(error, 'Could not load listings.') : '';

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
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
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
          <StateView
            isLoading={isLoading}
            loadingTitle="Loading active listings"
            error={error}
            errorTitle="Browse is unavailable"
            errorMessage={errorMessage}
            onRetry={() => void refetch()}
            retryLabel="Try again"
            isEmpty={items.length === 0}
            emptyIcon="leaf-outline"
            emptyTitle="No listings found"
            emptyMessage="Try another category or condition, or pull down to refresh."
            containerClassName="flex-1 min-h-[240px] px-[22px] py-[34px]"
          />
        }
        ListFooterComponent={
          items.length > 0 ? (
            <View className="items-center pt-[18px] pb-[4px]">
              {errorMessage ? <Text accessibilityRole="alert" className="text-danger text-center text-[13px] leading-[19px] mb-[8px]">{errorMessage}</Text> : null}
              {hasNextPage ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Load more listings"
                  accessibilityState={{ disabled: isFetchingNextPage, busy: isFetchingNextPage }}
                  className={`min-w-[150px] min-h-[48px] border border-leaf rounded-[14px] items-center justify-center bg-surface active:opacity-[0.72] ${isFetchingNextPage ? 'opacity-[0.55]' : ''}`}
                  disabled={isFetchingNextPage}
                  onPress={() => void fetchNextPage()}
                >
                  {isFetchingNextPage ? <ActivityIndicator color={colors.leaf} /> : <Text className="text-leaf-dark text-[14px] font-extrabold">Load more</Text>}
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
