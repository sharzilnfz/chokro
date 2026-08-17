import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { categoryLabel, formatQuantityWithUnit } from '@/types';
import type { VisionScanResult } from '@/hooks/useVisionScan';
import { PathBadge, pathVisual, type PathVisual } from '@/components/vision/PathBadge';
import { ConfidenceMeter, confidenceColor } from '@/components/vision/ConfidenceMeter';
import { EwasteHazardBanner } from '@/components/vision/EwasteHazardBanner';

export { PathBadge, pathVisual, ConfidenceMeter, confidenceColor, type PathVisual };

export interface VisionResultCardProps {
  result: VisionScanResult;
  photoPreviewUri: string | null;
  onListScrap: () => void;
  onScanAgain: () => void;
}

function formatBdt(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export const VisionResultCard = React.memo(function VisionResultCard({
  result,
  photoPreviewUri,
  onListScrap,
  onScanAgain,
}: VisionResultCardProps) {
  const { classification, valuation, recommendation } = result;
  const visual = pathVisual(recommendation.next_life_path);
  const confidencePct = Math.round(Math.min(1, Math.max(0, classification.confidence)) * 100);
  const confTheme = confidenceColor(classification.confidence);
  const hasBenchmark =
    valuation.market_benchmark_bdt !== undefined && valuation.market_benchmark_bdt !== null;

  return (
    <Animated.View
      entering={FadeInUp.duration(420)}
      className="bg-surface border border-border rounded-md p-[16px] mt-[13px] shadow-card"
      style={{ elevation: 2 }}
      accessibilityLabel={`AI verdict: ${categoryLabel(classification.category)} in ${categoryLabel(
        classification.condition,
      )} condition`}
    >
      <View className="flex-row items-center gap-[12px]">
        {photoPreviewUri ? (
          <Image
            source={{ uri: photoPreviewUri }}
            className="w-[56px] h-[56px] rounded-[14px] bg-surface-muted"
            style={{ resizeMode: 'cover' }}
            accessibilityLabel="Scanned item photo"
          />
        ) : (
          <View
            className="w-[56px] h-[56px] rounded-[14px] bg-leaf-soft items-center justify-center"
            accessibilityElementsHidden
          >
            <Ionicons name="sparkles" size={24} color={colors.leaf} />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">AI VERDICT</Text>
          <Text
            className="text-ink text-[22px] leading-[27px] font-extrabold tracking-tight mt-[1px]"
            numberOfLines={1}
          >
            {categoryLabel(classification.category)}
          </Text>
        </View>
        <View className="bg-surface-muted border border-border rounded-pill px-[11px] py-[7px]">
          <Text className="text-ink text-[12px] font-extrabold" style={{ color: confTheme.solid }}>
            {confidencePct}%
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-[8px] mt-[13px]">
        <View className="flex-row items-center gap-[6px] bg-leaf-soft border border-leaf rounded-pill px-[12px] min-h-[36px]">
          <Ionicons name="pricetags-outline" size={14} color={colors.leafDark} />
          <Text className="text-leaf-dark text-[13px] font-bold">
            {categoryLabel(classification.category)}
          </Text>
        </View>
        <View className="flex-row items-center gap-[6px] bg-background border border-border rounded-pill px-[12px] min-h-[36px]">
          <Ionicons name="speedometer-outline" size={14} color={colors.muted} />
          <Text className="text-muted text-[13px] font-bold">
            {categoryLabel(classification.condition)}
          </Text>
        </View>
      </View>

      <View className="mt-[14px]">
        <ConfidenceMeter confidence={classification.confidence} />
      </View>

      <View className="flex-row items-baseline justify-between mt-[14px] pt-[13px] border-t border-border/60">
        <Text className="text-muted text-[13px] font-bold">
          {formatQuantityWithUnit(classification.unit, classification.quantity)}
        </Text>
        <Text className="text-muted text-[12px] font-semibold">
          ৳{formatBdt(valuation.unit_price_bdt)}/{classification.unit}
        </Text>
      </View>

      <Animated.Text
        entering={FadeInUp.duration(520).delay(90)}
        className="text-ink text-[46px] leading-[54px] font-black tracking-tight mt-[4px]"
        accessibilityLabel={`Estimated value ${formatBdt(valuation.total_estimated_bdt)} taka`}
      >
        ৳{formatBdt(valuation.total_estimated_bdt)}
      </Animated.Text>
      <Text className="text-muted text-[12px] font-medium mt-[1px]">
        {formatQuantityWithUnit(classification.unit, classification.quantity)} × ৳
        {formatBdt(valuation.unit_price_bdt)}/{classification.unit} at today&apos;s published rate
      </Text>

      <View className="mt-[15px]">
        <PathBadge path={recommendation.next_life_path} big />
      </View>

      {classification.is_ewaste_hazard ? <EwasteHazardBanner /> : null}

      {recommendation.reasoning_rationale ? (
        <View className="border-l-[3px] border-leaf bg-leaf-soft rounded-r-[10px] px-[13px] py-[11px] mt-[13px]">
          <Text className="text-leaf-dark text-[12px] leading-[18px] font-semibold italic">
            &ldquo;{recommendation.reasoning_rationale}&rdquo;
          </Text>
        </View>
      ) : null}

      {recommendation.suggested_action ? (
        <View className="flex-row items-start gap-[8px] mt-[11px]">
          <Ionicons name="arrow-forward-circle-outline" size={17} color={colors.leaf} />
          <Text className="text-muted text-[12px] leading-[18px] font-medium flex-1">
            {recommendation.suggested_action}
          </Text>
        </View>
      ) : null}

      {hasBenchmark ? (
        <View className="flex-row items-center gap-[7px] mt-[12px] pt-[11px] border-t border-border/60">
          <Ionicons
            name={
              valuation.drift_status === 'UNDER_MARKET'
                ? 'trending-down'
                : valuation.drift_status === 'OVER_MARKET'
                  ? 'trending-up'
                  : 'swap-horizontal-outline'
            }
            size={15}
            color={valuation.drift_status === 'UNDER_MARKET' ? colors.amber : colors.leaf}
          />
          <Text className="text-muted text-[11px] leading-[15px] font-semibold flex-1">
            Market benchmark ৳{formatBdt(Number(valuation.market_benchmark_bdt))}/
            {classification.unit}
            {typeof valuation.drift_pct === 'number'
              ? ` · ${Math.abs(valuation.drift_pct)}% ${
                  valuation.drift_status === 'UNDER_MARKET'
                    ? 'under'
                    : valuation.drift_status === 'OVER_MARKET'
                      ? 'above'
                      : 'vs'
                } global index`
              : ''}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="List this scrap with the detected details"
        className="min-h-[54px] rounded-[15px] bg-leaf flex-row items-center justify-center gap-[8px] mt-[16px] active:opacity-[0.72]"
        onPress={onListScrap}
      >
        <Ionicons name="add-circle-outline" size={19} color={colors.surface} />
        <Text className="text-surface text-[16px] font-extrabold">List this scrap</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Scan another item"
        className="min-h-[48px] rounded-[15px] bg-background border border-border items-center justify-center mt-[9px] active:opacity-[0.72]"
        onPress={onScanAgain}
      >
        <Text className="text-ink text-[15px] font-bold">Scan another item</Text>
      </Pressable>
    </Animated.View>
  );
});
