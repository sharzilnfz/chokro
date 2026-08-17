import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { CATEGORIES, categoryLabel } from '@/types';
import { RateCardRow } from '@/components/RateCardRow';
import { StateView } from '@/components/ui/StateView';
import { useRateCard, type RowRate } from '@/hooks/useRateCard';

export const RateCardBrowser = React.memo(function RateCardBrowser() {
  const { data: rowRates = [], isLoading, error, refetch, isRefetching } = useRateCard();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredRates = useMemo(() => {
    if (selectedCategory === 'ALL') return rowRates;
    return rowRates.filter((item) => item.category === selectedCategory);
  }, [rowRates, selectedCategory]);

  const selectFilter = useCallback((cat: string) => {
    setSelectedCategory(cat);
  }, []);

  const renderItem = useCallback(({ item }: { item: RowRate }) => {
    return <RateCardRow item={item} />;
  }, []);

  const keyExtractor = useCallback((item: RowRate) => item.category, []);

  return (
    <StateView
      isLoading={isLoading}
      loadingTitle="Loading rate card"
      loadingSubtitle="Fetching official published prices."
      error={error}
      errorTitle="Rate card unavailable"
      errorMessage={error ? getErrorMessage(error, 'Could not load published rates.') : undefined}
      onRetry={() => void refetch()}
      retryLabel="Try again"
    >
      <View className="flex-1">
        {/* Category filter bar */}
        <View className="mb-[14px]">
          <Text className="text-ink text-[12px] font-extrabold mb-[8px]">Filter Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          >
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel="All categories"
              accessibilityState={{ checked: selectedCategory === 'ALL' }}
              className={`min-h-[42px] px-[14px] rounded-pill border items-center justify-center active:opacity-[0.72] ${
                selectedCategory === 'ALL' ? 'border-leaf bg-leaf-soft' : 'border-border bg-surface'
              }`}
              onPress={() => selectFilter('ALL')}
            >
              <Text className={`text-[13px] font-bold ${selectedCategory === 'ALL' ? 'text-leaf-dark' : 'text-muted'}`}>
                All
              </Text>
            </Pressable>
            {CATEGORIES.map((cat) => {
              const selected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  accessibilityRole="radio"
                  accessibilityLabel={categoryLabel(cat)}
                  accessibilityState={{ checked: selected }}
                  className={`min-h-[42px] px-[14px] rounded-pill border items-center justify-center active:opacity-[0.72] ${
                    selected ? 'border-leaf bg-leaf-soft' : 'border-border bg-surface'
                  }`}
                  onPress={() => selectFilter(cat)}
                >
                  <Text className={`text-[13px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}>
                    {categoryLabel(cat)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Rate card list */}
        {filteredRates.length === 0 ? (
          <StateView
            isEmpty
            emptyIcon="pricetag-outline"
            emptyTitle="No published rates found"
            emptyMessage="No rate entries match the selected filter."
            containerClassName="border border-border rounded-md bg-surface mt-[8px]"
          />
        ) : (
          <FlatList
            data={filteredRates}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 32 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => void refetch()}
                colors={[colors.leaf]}
                tintColor={colors.leaf}
              />
            }
          />
        )}
      </View>
    </StateView>
  );
});
