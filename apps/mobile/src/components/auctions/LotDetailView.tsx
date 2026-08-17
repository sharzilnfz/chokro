import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { StateView } from '@/components/ui/StateView';
import { useAuctionLot } from '@/hooks/useAuctionLot';
import { usePlaceBid } from '@/hooks/usePlaceBid';
import { LotHeroCard } from '@/components/auctions/LotHeroCard';
import { BidFeedRow } from '@/components/auctions/BidFeedRow';
import { QuickBidAction } from '@/components/auctions/QuickBidAction';
import { AuctionOutcomeBanner } from '@/components/auctions/AuctionOutcomeBanner';

export interface LotDetailViewProps {
  lotId: string;
  onBack: () => void;
}

const ANTI_SNIPE_WINDOW_MS = 2 * 60 * 1000;
const MIN_INCREMENT_BDT = 50;

export const LotDetailView = React.memo(function LotDetailView({
  lotId,
  onBack,
}: LotDetailViewProps) {
  const detailQuery = useAuctionLot(lotId);
  const placeBid = usePlaceBid();
  const [now, setNow] = useState(() => Date.now());
  const [amountText, setAmountText] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const detail = detailQuery.data ?? null;
  const lot = detail?.lot ?? null;
  const bids = detail?.bids ?? [];

  useEffect(() => {
    if (lot) {
      setAmountText(String(Math.round(lot.current_price_bdt) + MIN_INCREMENT_BDT));
    }
  }, [lot?.id, lot?.current_price_bdt]);

  const quickRaise = useCallback((delta: number) => {
    setAmountText((prev) => {
      const base = Number.parseFloat(prev);
      const next = (Number.isFinite(base) ? base : 0) + delta;
      return String(Math.round(next));
    });
  }, []);

  const submitBid = useCallback(() => {
    const amount = Number.parseFloat(amountText);
    if (!lot || !Number.isFinite(amount)) return;
    placeBid.mutate(
      { lotId: lot.id, amount },
      { onError: () => void detailQuery.refetch() },
    );
  }, [lot, amountText, placeBid, detailQuery]);

  if (detailQuery.isLoading || !lot) {
    return (
      <StateView
        fullScreen
        isLoading
        loadingTitle="Loading the lot"
        loadingSubtitle="Fetching live bids and price."
      />
    );
  }

  const live = lot.status === 'LIVE';
  const msLeft = new Date(lot.closes_at).getTime() - now;
  const urgent = live && msLeft > 0 && msLeft < ANTI_SNIPE_WINDOW_MS;
  const totalMs = new Date(lot.closes_at).getTime() - new Date(lot.opens_at).getTime();
  const leadingBid = bids[0] ?? null;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={detailQuery.isRefetching}
          onRefresh={() => void detailQuery.refetch()}
          colors={[colors.leaf]}
          tintColor={colors.leaf}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to all auctions"
        hitSlop={8}
        className="flex-row items-center gap-[4px] self-start min-h-[40px] mb-[8px] active:opacity-[0.72]"
        onPress={onBack}
      >
        <Ionicons name="chevron-back" size={20} color={colors.leafDark} />
        <Text className="text-leaf-dark text-[14px] font-extrabold">All auctions</Text>
      </Pressable>

      {/* Hero card */}
      <LotHeroCard
        lot={lot}
        leadingBid={leadingBid}
        msLeft={msLeft}
        totalMs={totalMs}
        urgent={urgent}
      />

      {detail?.outcome ? <AuctionOutcomeBanner outcome={detail.outcome} /> : null}

      {/* Bid feed */}
      <Text
        accessibilityRole="header"
        className="text-ink text-[19px] font-extrabold tracking-tight mb-[10px]"
      >
        Bid feed
      </Text>
      {bids.length === 0 ? (
        <StateView
          isEmpty
          emptyIcon="hammer-outline"
          emptyTitle="No bids yet"
          emptyMessage={
            live ? 'Be the first to open the bidding below.' : 'This lot closed without bids.'
          }
          containerClassName="border border-border rounded-md bg-surface mb-[14px]"
        />
      ) : (
        <View className="gap-[8px] mb-[16px]">
          {bids.map((bid, index) => (
            <BidFeedRow key={bid.id} bid={bid} now={now} leading={live && index === 0} />
          ))}
        </View>
      )}

      {/* Quick bid submission */}
      {live ? (
        <QuickBidAction
          lot={lot}
          amountText={amountText}
          onChangeAmountText={setAmountText}
          onQuickRaise={quickRaise}
          onSubmitBid={submitBid}
          isPending={placeBid.isPending}
          errorMessage={
            placeBid.error ? getErrorMessage(placeBid.error, 'Could not place this bid.') : undefined
          }
        />
      ) : null}
    </ScrollView>
  );
});
