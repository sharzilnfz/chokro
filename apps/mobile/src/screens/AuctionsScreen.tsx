import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { StateView } from '@/components/ui/StateView';
import { useAuctionLots, type AuctionLot } from '@/hooks/useAuctionLots';
import { LotCard } from '@/components/auctions/LotCard';
import { LotDetailView } from '@/components/auctions/LotDetailView';

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function LotListView({ onOpen }: { onOpen: (lot: AuctionLot) => void }) {
  const lotsQuery = useAuctionLots();
  const now = useNow();
  const lots = useMemo(() => lotsQuery.data ?? [], [lotsQuery.data]);

  return (
    <StateView
      fullScreen
      isLoading={lotsQuery.isLoading}
      loadingTitle="Opening the auction floor"
      loadingSubtitle="Loading live B2B scrap lots."
      error={lotsQuery.error}
      errorTitle="Auctions unavailable"
      errorMessage={
        lotsQuery.error ? getErrorMessage(lotsQuery.error, 'Could not load auction lots.') : undefined
      }
      onRetry={() => void lotsQuery.refetch()}
      retryLabel="Try again"
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={lotsQuery.isRefetching}
            onRefresh={() => void lotsQuery.refetch()}
            colors={[colors.leaf]}
            tintColor={colors.leaf}
          />
        }
      >
        <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">
          LIVE B2B AUCTIONS
        </Text>
        <Text
          accessibilityRole="header"
          className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]"
        >
          Bulk scrap lots
        </Text>
        <Text className="text-muted text-[14px] leading-[21px] mt-[6px] mb-[18px]">
          Campus and factory lots auctioned to verified recyclers. Sealed reserve, ৳50 minimum
          steps, and a last-bid anti-snipe window that keeps the floor open.
        </Text>

        {lots.length === 0 ? (
          <StateView
            isEmpty
            emptyIcon="hammer-outline"
            emptyTitle="No auctions on the floor"
            emptyMessage="Bulk lots posted by partners will appear here the moment they go live."
            containerClassName="border border-border rounded-md bg-surface"
          />
        ) : (
          <View className="gap-[12px]">
            {lots.map((lot, index) => (
              <Animated.View
                key={lot.id}
                entering={FadeInUp.duration(350).delay(Math.min(index, 5) * 60)}
              >
                <LotCard lot={lot} now={now} onOpen={onOpen} />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </StateView>
  );
}

export function AuctionsScreen() {
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

  const handleOpen = useCallback((lot: AuctionLot) => {
    setSelectedLotId(lot.id);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedLotId(null);
  }, []);

  return selectedLotId == null ? (
    <LotListView onOpen={handleOpen} />
  ) : (
    <LotDetailView lotId={selectedLotId} onBack={handleBack} />
  );
}
