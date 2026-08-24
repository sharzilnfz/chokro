import React from 'react';
import { Text, View } from 'react-native';
import { categoryLabel } from '@/types';
import type { AuctionBid } from '@/hooks/useAuctionLot';
import type { AuctionLot } from '@/hooks/useAuctionLots';
import { AuctionCategoryBadge } from '@/components/auctions/AuctionCategoryBadge';
import { LivePriceTicker } from '@/components/auctions/LivePriceTicker';
import { AntiSnipeCountdown } from '@/components/auctions/AntiSnipeCountdown';

export interface LotHeroCardProps {
  lot: AuctionLot & { seller_org_name?: string };
  leadingBid: AuctionBid | null;
  msLeft: number;
  totalMs: number;
  urgent: boolean;
}

function formatBdtAmount(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

export const LotHeroCard = React.memo(function LotHeroCard({
  lot,
  leadingBid,
  msLeft,
  totalMs,
  urgent,
}: LotHeroCardProps) {
  const live = lot.status === 'LIVE';

  return (
    <View
      className="bg-surface border border-border rounded-md p-[16px] shadow-card mb-[14px]"
      style={{ elevation: 2 }}
    >
      <View className="flex-row items-center justify-between gap-[10px]">
        <View className="flex-row items-center gap-[10px]">
          <AuctionCategoryBadge category={lot.category} />
          <View className="min-w-0">
            <Text className="text-ink text-[11px] font-extrabold tracking-[0.8px] uppercase">
              {categoryLabel(lot.category)}
            </Text>
            <Text className="text-muted text-[12px]">
              {formatBdtAmount(lot.quantity_kg)} kg{lot.origin_label ? ` · ${lot.origin_label}` : ''}
            </Text>
          </View>
        </View>
        <View
          className={`px-[10px] py-[3px] rounded-pill ${
            live ? 'bg-leaf' : 'bg-surface-muted'
          }`}
        >
          <Text
            className={`text-[11px] font-extrabold tracking-[0.6px] ${
              live ? 'text-surface' : 'text-muted'
            }`}
          >
            {lot.status}
          </Text>
        </View>
      </View>

      <Text
        accessibilityRole="header"
        className="text-ink text-[19px] leading-[24px] font-extrabold tracking-tight mt-[12px]"
      >
        {lot.title}
      </Text>
      {lot.description ? (
        <Text className="text-muted text-[13px] leading-[19px] mt-[6px]">{lot.description}</Text>
      ) : null}
      {lot.seller_org_name ? (
        <Text className="text-muted text-[12px] mt-[8px]">
          Posted by <Text className="text-leaf-dark font-bold">{lot.seller_org_name}</Text>
        </Text>
      ) : null}

      {/* Live price ticker */}
      <LivePriceTicker lot={lot} leadingBid={leadingBid} />

      {/* Anti-snipe countdown */}
      {live ? (
        <AntiSnipeCountdown msLeft={msLeft} totalMs={totalMs} urgent={urgent} />
      ) : null}
    </View>
  );
});
