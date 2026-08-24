import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { categoryLabel } from '@/types';
import { timeAgo, type ValuationScanRow } from '@/hooks/useScanHistory';
import { confidenceColor } from '@/components/vision/ConfidenceMeter';

export interface VisionHistorySectionProps {
  scans: ValuationScanRow[];
  onOpenScanId: (id: string) => void;
}

export const VisionHistorySection = React.memo(function VisionHistorySection({
  scans,
  onOpenScanId,
}: VisionHistorySectionProps) {
  if (scans.length === 0) return null;

  return (
    <View className="mt-[28px] pt-[20px] border-t border-border">
      <View className="flex-row items-center justify-between mb-[12px]">
        <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">
          RECENT AUDITS
        </Text>
        <Text className="text-muted text-[12px] font-semibold">
          {scans.length} past {scans.length === 1 ? 'scan' : 'scans'}
        </Text>
      </View>

      <View className="gap-[10px]">
        {scans.slice(0, 5).map((scan) => {
          const conf = parseFloat(scan.confidence) || 0;
          const confT = confidenceColor(conf);
          return (
            <Pressable
              key={scan.id}
              accessibilityRole="button"
              accessibilityLabel={`Past scan: ${categoryLabel(scan.detected_category)}, ${Math.round(
                conf * 100,
              )} percent confidence`}
              className="bg-surface border border-border rounded-md p-[14px] shadow-card flex-row items-center justify-between active:opacity-[0.72]"
              style={{ elevation: 1 }}
              onPress={() => onOpenScanId(scan.id)}
            >
              <View className="flex-1">
                <View className="flex-row items-center gap-[6px]">
                  <Text className="text-ink text-[14px] font-extrabold">
                    {categoryLabel(scan.detected_category)}
                  </Text>
                  <Text className="text-muted text-[12px]">· {timeAgo(scan.created_at)}</Text>
                </View>
                <Text className="text-muted text-[12px] mt-[2px]" numberOfLines={1}>
                  {scan.estimated_quantity} {scan.unit} · {categoryLabel(scan.detected_condition)}{' '}
                  · Next life: {scan.next_life_path}
                </Text>
              </View>
              <View
                className="px-[8px] py-[3px] rounded-pill border ml-[10px]"
                style={{ backgroundColor: confT.soft, borderColor: confT.solid }}
              >
                <Text className="text-[11px] font-extrabold" style={{ color: confT.solid }}>
                  {Math.round(conf * 100)}%
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});
