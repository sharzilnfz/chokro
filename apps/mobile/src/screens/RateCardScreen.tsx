// RateCardScreen shows "Today's rates": the current published per-unit rate for
// each category, with pull-to-refresh and empty/error states.

// React Native list primitives plus internal rate-card and UI imports.
import React, { useCallback } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { getErrorMessage } from '@/services/api';
import { RateCardRow } from '@/components/RateCardRow';
import { StateView } from '@/components/ui/StateView';
import { colors } from '@/theme';
import { useRateCard, type RowRate } from '@/hooks/useRateCard';

export function RateCardScreen() {
  // Rate card query, falling back to an empty list so renderers stay simple.
  const { data: rows = [], isLoading, error, refetch, isRefetching } = useRateCard();
  const errorMessage = error ? getErrorMessage(error, 'Could not load the current rate card.') : '';

  // Each row renders via the shared RateCardRow for a category.
  const renderItem = useCallback(({ item }: { item: RowRate }) => <RateCardRow item={item} />, []);

  return (
    // Full-screen state wrapper: overlays loading/error, then renders the list.
    <StateView
      fullScreen
      isLoading={isLoading}
      loadingTitle="Loading current rates"
      loadingSubtitle="Only the currently effective published rate is shown per category."
      error={rows.length === 0 ? error : null}
      errorTitle="Rate card unavailable"
      errorMessage={errorMessage}
      onRetry={() => void refetch()}
      retryLabel="Try again"
    >
      {/* Rate rows with the explanatory header and a bespoke empty state. */}
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
          // Title copy and unit explanation, plus an inline fetch error strip.
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
          // Shown only while an admin has not yet published any rate.
          <StateView
            isEmpty
            emptyIcon="pricetags-outline"
            emptyTitle="No published rates yet"
            emptyMessage="An admin will publish rates once the network is live."
            containerClassName="border border-border rounded-md bg-surface"
          />
        }
      />
    </StateView>
  );
}