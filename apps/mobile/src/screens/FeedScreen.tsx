import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { CATEGORIES, CONDITIONS, categoryLabel } from '@/types';
import { ListingCard } from '@/components/ListingCard';
import { StateView } from '@/components/ui/StateView';
import { useFeed, type FeedFilter, type ConditionFilter, type Listing } from '@/hooks/useFeed';


const FEED_CATEGORIES: FeedFilter[] = ['ALL', ...CATEGORIES];
const FEED_CONDITIONS: ConditionFilter[] = ['ALL', ...CONDITIONS];



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
