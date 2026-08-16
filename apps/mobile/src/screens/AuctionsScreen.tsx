import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { categoryLabel, type Category } from '@/types';
import { StateView } from '@/components/ui/StateView';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useAuctionLots, type AuctionLot } from '@/hooks/useAuctionLots';
import { useAuctionLot, type AuctionBid } from '@/hooks/useAuctionLot';
import { usePlaceBid } from '@/hooks/usePlaceBid';

/** Bids inside the final window extend the close by this long (mirrors the server rule). */
const ANTI_SNIPE_WINDOW_MS = 2 * 60 * 1000;
const MIN_INCREMENT_BDT = 50;

const QUICK_RAISES = [50, 100, 500] as const;

const CATEGORY_STYLE: Record<Category, { icon: keyof typeof Ionicons.glyphMap; tint: string }> = {
  CLOTHES: { icon: 'shirt-outline', tint: colors.leaf },
  BOOKS: { icon: 'book-outline', tint: colors.amber },
  PLASTICS: { icon: 'water-outline', tint: colors.leaf },
  PAPER: { icon: 'newspaper-outline', tint: colors.muted },
  METAL: { icon: 'cube-outline', tint: colors.leafDark },
  GLASS: { icon: 'wine-outline', tint: colors.leaf },
  FURNITURE: { icon: 'bed-outline', tint: colors.amber },
  APPLIANCES: { icon: 'flash-outline', tint: colors.amber },
  E_WASTE: { icon: 'warning-outline', tint: colors.danger },
};

function categoryStyle(category: string) {
  return CATEGORY_STYLE[category as Category] ?? { icon: 'leaf-outline' as const, tint: colors.leaf };
}

/** Ticking clock shared by every countdown so they all flip in the same frame. */
function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function formatBdtAmount(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

function formatCountdown(msLeft: number): string {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatCountdownAccessible(msLeft: number): string {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) return `${Math.floor(minutes / 60)} hours ${minutes % 60} minutes left`;
  return `${minutes} minutes ${seconds} seconds left`;
}

function formatRelativeTime(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function CategoryBadge({ category }: { category: string }) {
  const style = categoryStyle(category);
  return (
    <View
      accessibilityElementsHidden
      className="w-[40px] h-[40px] rounded-[12px] bg-surface-muted border border-border items-center justify-center"
    >
      <Ionicons name={style.icon} size={20} color={style.tint} />
    </View>
  );
}

function StatusPill({ status }: { status: AuctionLot['status'] }) {
  const pill =
    status === 'LIVE'
      ? { label: 'LIVE', className: 'bg-leaf text-surface' }
      : status === 'ENDED'
        ? { label: 'ENDED', className: 'bg-surface-muted text-muted' }
        : status === 'CANCELLED'
          ? { label: 'CANCELLED', className: 'bg-danger-soft text-danger' }
          : { label: 'DRAFT', className: 'bg-amber-soft text-amber' };
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Auction status: ${pill.label}`}
      className={`self-start flex-row items-center gap-[5px] px-[10px] py-[3px] rounded-pill ${pill.className}`}
    >
      {status === 'LIVE' ? <View className="w-[6px] h-[6px] rounded-pill bg-surface" /> : null}
      <Text className="text-[11px] font-extrabold tracking-[0.6px]">{pill.label}</Text>
    </View>
  );
}

function CountdownChip({ closesAt, now, ended }: { closesAt: string; now: number; ended: boolean }) {
  if (ended) {
    return (
      <View className="flex-row items-center gap-[4px] bg-surface-muted border border-border rounded-pill px-[9px] py-[4px]">
        <Ionicons name="checkmark-done-outline" size={12} color={colors.muted} />
        <Text className="text-muted text-[11px] font-extrabold">Closed</Text>
      </View>
    );
  }
  const msLeft = new Date(closesAt).getTime() - now;
  const urgent = msLeft > 0 && msLeft < ANTI_SNIPE_WINDOW_MS;
  const label = formatCountdown(msLeft);
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={formatCountdownAccessible(msLeft)}
      className={`flex-row items-center gap-[4px] rounded-pill px-[9px] py-[4px] border ${urgent ? 'bg-danger-soft border-danger' : 'bg-surface border-border'}`}
    >
      <Ionicons name="time-outline" size={12} color={urgent ? colors.danger : colors.leafDark} />
      <Text className={`text-[11px] font-extrabold ${urgent ? 'text-danger' : 'text-leaf-dark'}`}>{label}</Text>
    </View>
  );
}

function ReserveBadge({ reserveMet }: { reserveMet: boolean }) {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={reserveMet ? 'Reserve met' : 'Reserve not met'}
      className={`flex-row items-center gap-[4px] rounded-pill px-[9px] py-[4px] ${reserveMet ? 'bg-leaf-soft' : 'bg-surface-muted'}`}
    >
      <Ionicons
        name={reserveMet ? 'lock-open-outline' : 'lock-closed-outline'}
        size={12}
        color={reserveMet ? colors.leafDark : colors.muted}
      />
      <Text className={`text-[11px] font-bold ${reserveMet ? 'text-leaf-dark' : 'text-muted'}`}>
        {reserveMet ? 'Reserve met' : 'Reserve not met'}
      </Text>
    </View>
  );
}

function LotCard({ lot, now, onOpen }: { lot: AuctionLot; now: number; onOpen: (lot: AuctionLot) => void }) {
  const ended = lot.status !== 'LIVE';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${lot.title}, ${categoryLabel(lot.category)}, ${lot.quantity_kg} kilograms, current bid ${formatBdtAmount(lot.current_price_bdt)} taka, ${lot.bid_count} bids`}
      className="bg-surface border border-border rounded-md p-[16px] shadow-card active:opacity-[0.72]"
      style={{ elevation: 2 }}
      onPress={() => onOpen(lot)}
    >
      <View className="flex-row items-start gap-[12px]">
        <CategoryBadge category={lot.category} />
        <View className="flex-1 min-w-0">
          {ended ? (
            <View className="flex-row items-center gap-[6px] mb-[6px]">
              <View className="bg-surface-muted border border-border rounded-pill px-[9px] py-[3px]">
                <Text className="text-muted text-[11px] font-extrabold tracking-[0.6px]">ENDED</Text>
              </View>
              <Text className="text-muted text-[11px] font-bold" numberOfLines={1}>
                {lot.winning_bid_id ? 'Sold' : 'No sale'}
              </Text>
            </View>
          ) : null}
          <Text className="text-ink text-[15px] font-bold leading-[20px]" numberOfLines={2}>
            {lot.title}
          </Text>
          <Text className="text-muted text-[12px] mt-[3px]" numberOfLines={1}>
            {categoryLabel(lot.category)} · {formatBdtAmount(lot.quantity_kg)} kg
            {lot.origin_label ? ` · ${lot.origin_label}` : ''}
          </Text>
          <View className="mt-[9px]">
            <Text className="text-muted text-[10px] font-extrabold tracking-[0.8px]">
              {lot.bid_count > 0 ? 'CURRENT BID' : 'STARTING PRICE'}
            </Text>
            <Text className="text-ink text-[22px] leading-[27px] font-extrabold tracking-tight">
              ৳{formatBdtAmount(lot.current_price_bdt)}
            </Text>
          </View>
        </View>
        <View className="items-end gap-[6px]">
          <CountdownChip closesAt={lot.closes_at} now={now} ended={ended} />
          <View className="flex-row items-center gap-[4px] bg-surface-muted border border-border rounded-pill px-[9px] py-[4px]">
            <Ionicons name="hammer-outline" size={12} color={colors.leafDark} />
            <Text className="text-leaf-dark text-[11px] font-extrabold">{lot.bid_count}</Text>
          </View>
          <ReserveBadge reserveMet={lot.reserve_met} />
        </View>
      </View>
    </Pressable>
  );
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
      errorMessage={lotsQuery.error ? getErrorMessage(lotsQuery.error, 'Could not load auction lots.') : undefined}
      onRetry={() => void lotsQuery.refetch()}
      retryLabel="Try again"
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={lotsQuery.isRefetching}
            onRefresh={() => void lotsQuery.refetch()}
            colors={[colors.leaf]}
            tintColor={colors.leaf}
          />
        }
      >
        <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">LIVE B2B AUCTIONS</Text>
        <Text accessibilityRole="header" className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]">
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
              <Animated.View key={lot.id} entering={FadeInUp.duration(350).delay(Math.min(index, 5) * 60)}>
                <LotCard lot={lot} now={now} onOpen={onOpen} />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </StateView>
  );
}

function BidFeedRow({ bid, now, leading }: { bid: AuctionBid; now: number; leading: boolean }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      className={`flex-row items-center gap-[10px] border rounded-sm px-[10px] py-[9px] ${leading ? 'bg-leaf-soft border-leaf' : 'bg-surface-muted border-border'}`}
    >
      <View
        accessibilityElementsHidden
        className={`w-[28px] h-[28px] rounded-pill items-center justify-center ${leading ? 'bg-leaf' : 'bg-surface border border-border'}`}
      >
        <Text className={`text-[11px] font-extrabold ${leading ? 'text-surface' : 'text-muted'}`}>
          {bid.bid_number}
        </Text>
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-ink text-[13px] font-bold" numberOfLines={1}>
          {bid.bidder_org_name}
          {leading ? ' · leading' : ''}
        </Text>
        <Text className="text-muted text-[11px]">{formatRelativeTime(bid.received_at, now)}</Text>
      </View>
      <Text className="text-leaf-dark text-[15px] font-extrabold">৳{formatBdtAmount(bid.amount_bdt)}</Text>
    </Animated.View>
  );
}

function OutcomeCard({ outcome }: { outcome: { sold: boolean; winner_org_name?: string; final_price_bdt?: number; reason?: string } }) {
  return (
    <Animated.View
      entering={FadeInUp.duration(450)}
      className="bg-surface border border-border rounded-md p-[16px] shadow-card mb-[14px]"
      style={{ elevation: 2 }}
      accessibilityLiveRegion="polite"
    >
      <View className="flex-row items-center gap-[10px] mb-[8px]">
        <Ionicons
          name={outcome.sold ? 'trophy-outline' : 'lock-closed-outline'}
          size={22}
          color={outcome.sold ? colors.amber : colors.muted}
        />
        <Text className="text-ink text-[17px] font-extrabold tracking-tight">
          {outcome.sold ? 'Lot sold' : 'No sale'}
        </Text>
      </View>
      {outcome.sold ? (
        <>
          <Text className="text-ink text-[14px] font-bold">{outcome.winner_org_name} won this lot</Text>
          <Text className="text-muted text-[13px] mt-[3px]">
            Final price ৳{formatBdtAmount(outcome.final_price_bdt ?? 0)} · the highest bid cleared the sealed reserve.
          </Text>
        </>
      ) : (
        <Text className="text-muted text-[13px] leading-[19px]">{outcome.reason ?? 'Reserve not met'}</Text>
      )}
    </Animated.View>
  );
}

function LotDetailView({ lotId, onBack }: { lotId: string; onBack: () => void }) {
  const detailQuery = useAuctionLot(lotId);
  const placeBid = usePlaceBid();
  const now = useNow();
  const [amountText, setAmountText] = useState('');

  const detail = detailQuery.data ?? null;
  const lot = detail?.lot ?? null;
  const bids = detail?.bids ?? [];

  // Keep the bid box pre-filled with the minimum viable next bid.
  useEffect(() => {
    if (lot) setAmountText(String(Math.round(lot.current_price_bdt) + MIN_INCREMENT_BDT));
  }, [lot?.id, lot?.current_price_bdt]); // eslint-disable-line react-hooks/exhaustive-deps

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
      { onError: () => void detailQuery.refetch() }, // 409s mean the floor moved — resync now
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
  const remainingFraction = totalMs > 0 ? Math.min(1, Math.max(0, msLeft / totalMs)) : 0;
  const parsedAmount = Number.parseFloat(amountText);
  const canSubmit = live && Number.isFinite(parsedAmount) && parsedAmount > 0 && !placeBid.isPending;
  const leadingBid = bids[0] ?? null;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
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
        className="flex-row items-center gap-[4px] self-start min-h-[40px] mb-[6px] active:opacity-[0.72]"
        onPress={onBack}
      >
        <Ionicons name="chevron-back" size={20} color={colors.leafDark} />
        <Text className="text-leaf-dark text-[14px] font-extrabold">All auctions</Text>
      </Pressable>

      {/* Hero */}
      <View className="bg-surface border border-border rounded-md p-[16px] shadow-card mb-[14px]" style={{ elevation: 2 }}>
        <View className="flex-row items-center justify-between gap-[10px]">
          <View className="flex-row items-center gap-[10px]">
            <CategoryBadge category={lot.category} />
            <View className="min-w-0">
              <Text className="text-ink text-[11px] font-extrabold tracking-[0.8px] uppercase">
                {categoryLabel(lot.category)}
              </Text>
              <Text className="text-muted text-[12px]">
                {formatBdtAmount(lot.quantity_kg)} kg{lot.origin_label ? ` · ${lot.origin_label}` : ''}
              </Text>
            </View>
          </View>
          <StatusPill status={lot.status} />
        </View>

        <Text accessibilityRole="header" className="text-ink text-[19px] leading-[24px] font-extrabold tracking-tight mt-[12px]">
          {lot.title}
        </Text>
        {lot.description ? (
          <Text className="text-muted text-[13px] leading-[19px] mt-[6px]">{lot.description}</Text>
        ) : null}
        <Text className="text-muted text-[12px] mt-[8px]">
          Posted by <Text className="text-leaf-dark font-bold">{lot.seller_org_name}</Text>
        </Text>

        {/* Live price — keyed on the amount so every accepted bid re-animates */}
        <View
          className="flex-row items-end justify-between mt-[16px] pt-[14px] border-t border-border"
          accessibilityLabel={`Current price ${formatBdtAmount(lot.current_price_bdt)} taka`}
        >
          <View>
            <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">
              {lot.bid_count > 0 ? 'CURRENT PRICE' : 'STARTING PRICE'}
            </Text>
            <Animated.Text
              key={`price-${lot.current_price_bdt}`}
              entering={FadeInUp.duration(350)}
              className="text-ink text-[36px] leading-[42px] font-extrabold tracking-tight"
            >
              ৳{formatBdtAmount(lot.current_price_bdt)}
            </Animated.Text>
            {leadingBid ? (
              <Text className="text-muted text-[12px] mt-[2px]" numberOfLines={1}>
                Top bid #{leadingBid.bid_number} by {leadingBid.bidder_org_name}
              </Text>
            ) : (
              <Text className="text-muted text-[12px] mt-[2px]">No bids yet — open the floor</Text>
            )}
          </View>
          <View className="items-end gap-[6px]">
            <ReserveBadge reserveMet={lot.reserve_met} />
            <View className="flex-row items-center gap-[4px] bg-surface-muted border border-border rounded-pill px-[9px] py-[4px]">
              <Ionicons name="hammer-outline" size={12} color={colors.leafDark} />
              <Text className="text-leaf-dark text-[11px] font-extrabold">{lot.bid_count} bids</Text>
            </View>
          </View>
        </View>

        {/* Countdown */}
        {live ? (
          <View className="mt-[14px]">
            <View className="flex-row items-center justify-between mb-[7px]">
              <Text className="text-muted text-[11px] font-extrabold tracking-[0.8px]">CLOSES IN</Text>
              <Text
                accessibilityRole="text"
                accessibilityLabel={formatCountdownAccessible(msLeft)}
                className={`text-[15px] font-extrabold ${urgent ? 'text-danger' : 'text-ink'}`}
              >
                {formatCountdown(msLeft)}
              </Text>
            </View>
            <View className="h-[7px] rounded-pill bg-surface-muted border border-border overflow-hidden">
              <View
                className={`h-[7px] rounded-pill ${urgent ? 'bg-danger' : 'bg-leaf'}`}
                style={{ width: `${Math.round(remainingFraction * 100)}%` }}
              />
            </View>
            <Text className={`text-[11px] mt-[7px] leading-[16px] ${urgent ? 'text-danger font-bold' : 'text-muted'}`}>
              {urgent
                ? 'Anti-snipe window — any new bid adds another 2:00 to the clock'
                : 'Final 2 minutes: new bids extend the close'}
            </Text>
          </View>
        ) : null}
      </View>

      {detail?.outcome ? <OutcomeCard outcome={detail.outcome} /> : null}

      {/* Bid feed */}
      <Text accessibilityRole="header" className="text-ink text-[19px] font-extrabold tracking-tight mb-[10px]">
        Bid feed
      </Text>
      {bids.length === 0 ? (
        <StateView
          isEmpty
          emptyIcon="hammer-outline"
          emptyTitle="No bids yet"
          emptyMessage={live ? 'Be the first to open the bidding below.' : 'This lot closed without bids.'}
          containerClassName="border border-border rounded-md bg-surface mb-[14px]"
        />
      ) : (
        <View className="gap-[8px] mb-[16px]">
          {bids.map((bid, index) => (
            <BidFeedRow key={bid.id} bid={bid} now={now} leading={live && index === 0} />
          ))}
        </View>
      )}

      {/* Place bid */}
      {live ? (
        <View className="bg-surface border border-border rounded-md p-[16px] shadow-card" style={{ elevation: 2 }}>
          <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">PLACE YOUR BID</Text>
          {placeBid.error ? (
            <View className="mt-[10px]">
              <ErrorBanner message={getErrorMessage(placeBid.error, 'Could not place this bid.')} />
            </View>
          ) : null}

          <View className="flex-row items-center border border-border rounded-sm bg-surface min-h-[52px] mt-[12px] px-[14px]">
            <Text className="text-muted text-[17px] font-extrabold mr-[6px]">৳</Text>
            <TextInput
              className="flex-1 text-ink text-[17px] font-extrabold min-w-0"
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="number-pad"
              accessibilityLabel="Your bid amount in taka"
              accessibilityHint={`Minimum next bid is ${formatBdtAmount(lot.current_price_bdt + MIN_INCREMENT_BDT)} taka`}
            />
          </View>

          <View className="flex-row gap-[8px] mt-[10px]">
            {QUICK_RAISES.map((delta) => (
              <Pressable
                key={delta}
                accessibilityRole="button"
                accessibilityLabel={`Raise bid by ${delta} taka`}
                className="min-h-[40px] flex-1 items-center justify-center rounded-pill border border-border bg-surface active:opacity-[0.72]"
                onPress={() => quickRaise(delta)}
              >
                <Text className="text-leaf-dark text-[13px] font-extrabold">+৳{delta}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={Number.isFinite(parsedAmount) ? `Confirm bid of ${formatBdtAmount(parsedAmount)} taka` : 'Confirm bid'}
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            className={`min-h-[52px] rounded-sm items-center justify-center mt-[14px] flex-row gap-[6px] active:opacity-[0.72] ${canSubmit ? 'bg-leaf' : 'bg-surface-muted'}`}
            onPress={submitBid}
          >
            {placeBid.isPending ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <>
                <Ionicons name="hammer" size={16} color={canSubmit ? colors.surface : colors.muted} />
                <Text className={`text-[15px] font-extrabold ${canSubmit ? 'text-surface' : 'text-muted'}`}>
                  {Number.isFinite(parsedAmount) ? `Confirm bid · ৳${formatBdtAmount(parsedAmount)}` : 'Confirm bid'}
                </Text>
              </>
            )}
          </Pressable>
          <Text className="text-muted text-[11px] leading-[16px] mt-[9px]">
            ৳{MIN_INCREMENT_BDT} minimum step above the current price · the seller's reserve stays sealed until the lot closes.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

export function AuctionsScreen() {
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

  return selectedLotId == null ? (
    <LotListView onOpen={(lot) => setSelectedLotId(lot.id)} />
  ) : (
    <LotDetailView lotId={selectedLotId} onBack={() => setSelectedLotId(null)} />
  );
}
