import React from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import type { AuctionLot } from '@/hooks/useAuctionLots';

export interface QuickBidActionProps {
  lot: AuctionLot;
  amountText: string;
  onChangeAmountText: (text: string) => void;
  onQuickRaise: (delta: number) => void;
  onSubmitBid: () => void;
  isPending: boolean;
  errorMessage?: string;
}

const QUICK_RAISES = [50, 100, 500] as const;
const MIN_INCREMENT_BDT = 50;

function formatBdtAmount(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

export const QuickBidAction = React.memo(function QuickBidAction({
  lot,
  amountText,
  onChangeAmountText,
  onQuickRaise,
  onSubmitBid,
  isPending,
  errorMessage,
}: QuickBidActionProps) {
  const parsedAmount = Number.parseFloat(amountText);
  const live = lot.status === 'LIVE';
  const minNextBid = lot.current_price_bdt + MIN_INCREMENT_BDT;
  const canSubmit =
    live && Number.isFinite(parsedAmount) && parsedAmount >= minNextBid && !isPending;

  return (
    <View
      className="bg-surface border border-border rounded-md p-[16px] shadow-card"
      style={{ elevation: 2 }}
    >
      <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">
        PLACE YOUR BID
      </Text>

      {errorMessage ? (
        <View className="mt-[10px]">
          <ErrorBanner message={errorMessage} />
        </View>
      ) : null}

      <View className="flex-row items-center border border-border rounded-sm bg-background min-h-[52px] mt-[12px] px-[14px]">
        <Text className="text-muted text-[17px] font-extrabold mr-[6px]">৳</Text>
        <TextInput
          className="flex-1 text-ink text-[17px] font-extrabold min-w-0"
          value={amountText}
          onChangeText={onChangeAmountText}
          keyboardType="number-pad"
          accessibilityLabel="Your bid amount in taka"
          accessibilityHint={`Minimum next bid is ${formatBdtAmount(minNextBid)} taka`}
        />
      </View>

      <View className="flex-row gap-[8px] mt-[10px]">
        {QUICK_RAISES.map((delta) => (
          <Pressable
            key={delta}
            accessibilityRole="button"
            accessibilityLabel={`Raise bid by ${delta} taka`}
            className="min-h-[40px] flex-1 items-center justify-center rounded-pill border border-border bg-surface active:opacity-[0.72]"
            onPress={() => onQuickRaise(delta)}
          >
            <Text className="text-leaf-dark text-[13px] font-extrabold">+৳{delta}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          Number.isFinite(parsedAmount)
            ? `Confirm bid of ${formatBdtAmount(parsedAmount)} taka`
            : 'Confirm bid'
        }
        accessibilityState={{ disabled: !canSubmit }}
        disabled={!canSubmit}
        className={`min-h-[52px] rounded-sm items-center justify-center mt-[14px] flex-row gap-[6px] active:opacity-[0.72] ${
          canSubmit ? 'bg-leaf' : 'bg-surface-muted'
        }`}
        onPress={onSubmitBid}
      >
        {isPending ? (
          <ActivityIndicator size="small" color={colors.surface} />
        ) : (
          <>
            <Ionicons
              name="hammer"
              size={16}
              color={canSubmit ? colors.surface : colors.muted}
            />
            <Text
              className={`text-[15px] font-extrabold ${
                canSubmit ? 'text-surface' : 'text-muted'
              }`}
            >
              {Number.isFinite(parsedAmount)
                ? `Confirm bid · ৳${formatBdtAmount(parsedAmount)}`
                : 'Confirm bid'}
            </Text>
          </>
        )}
      </Pressable>
      <Text className="text-muted text-[11px] leading-[16px] mt-[9px]">
        ৳{MIN_INCREMENT_BDT} minimum step above the current price · the seller&apos;s reserve stays
        sealed until the lot closes.
      </Text>
    </View>
  );
});
