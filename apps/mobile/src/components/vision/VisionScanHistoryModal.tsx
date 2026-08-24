import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { categoryLabel } from '@/types';
import { timeAgo, useScanDetail, type ValuationScanRow } from '@/hooks/useScanHistory';
import { confidenceColor, pathVisual } from '@/components/VisionResultCard';

export interface VisionScanHistoryModalProps {
  openScanId: string | null;
  onClose: () => void;
}

export const VisionScanHistoryModal = React.memo(function VisionScanHistoryModal({
  openScanId,
  onClose,
}: VisionScanHistoryModalProps) {
  const scanDetail = useScanDetail(openScanId);
  const scan = scanDetail.data ?? null;

  return (
    <Modal
      visible={openScanId !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-ink/60 justify-end">
        <View
          className="bg-surface rounded-t-[24px] max-h-[85%] p-[20px] pb-[36px]"
          style={{ elevation: 8 }}
        >
          <View className="flex-row items-center justify-between pb-[12px] border-b border-border">
            <View>
              <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">
                PAST SCAN AUDIT
              </Text>
              <Text className="text-ink text-[19px] font-extrabold tracking-tight mt-[2px]">
                Classification detail
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close scan detail"
              className="w-[40px] h-[40px] rounded-pill bg-surface-muted items-center justify-center active:opacity-[0.72]"
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>

          {scanDetail.isLoading || !scan ? (
            <View className="py-[40px] items-center justify-center">
              <ActivityIndicator color={colors.leaf} size="small" />
              <Text className="text-muted text-[13px] font-bold mt-[10px]">
                Loading scan audit…
              </Text>
            </View>
          ) : (
            <ScrollView className="mt-[14px]" showsVerticalScrollIndicator={false}>
              <View className="flex-row items-center justify-between mb-[14px]">
                <View className="flex-row items-center gap-[8px]">
                  <View className="w-[36px] h-[36px] rounded-[10px] bg-surface-muted border border-border items-center justify-center">
                    <Ionicons name="scan-outline" size={18} color={colors.leaf} />
                  </View>
                  <View>
                    <Text className="text-ink text-[16px] font-extrabold">
                      {categoryLabel(scan.detected_category)}
                    </Text>
                    <Text className="text-muted text-[12px]">
                      {categoryLabel(scan.detected_condition)} band · {timeAgo(scan.created_at)}
                    </Text>
                  </View>
                </View>
                <View
                  className="px-[10px] py-[4px] rounded-pill border"
                  style={{
                    backgroundColor: confidenceColor(parseFloat(scan.confidence) || 0).soft,
                    borderColor: confidenceColor(parseFloat(scan.confidence) || 0).solid,
                  }}
                >
                  <Text
                    className="text-[11px] font-extrabold"
                    style={{ color: confidenceColor(parseFloat(scan.confidence) || 0).solid }}
                  >
                    {Math.round((parseFloat(scan.confidence) || 0) * 100)}% confidence
                  </Text>
                </View>
              </View>

              {/* Next life badge */}
              {(() => {
                const visual = pathVisual(scan.next_life_path);
                return (
                  <View
                    className="p-[14px] rounded-md border mb-[14px]"
                    style={{ backgroundColor: visual.soft, borderColor: visual.solid }}
                  >
                    <View className="flex-row items-center gap-[8px]">
                      <Ionicons name={visual.icon} size={18} color={visual.solid} />
                      <Text
                        className="text-[13px] font-extrabold uppercase tracking-[0.8px]"
                        style={{ color: visual.solid }}
                      >
                        Recommended Next Life: {visual.title}
                      </Text>
                    </View>
                    <Text className="text-ink text-[13px] leading-[19px] mt-[6px]">
                      {scan.reasoning_rationale}
                    </Text>
                  </View>
                );
              })()}

              {/* Metrics */}
              <View className="flex-row gap-[10px] mb-[14px]">
                <View className="flex-1 bg-surface-muted border border-border rounded-md p-[12px]">
                  <Text className="text-muted text-[10px] font-extrabold tracking-[0.8px]">
                    ESTIMATED QUANTITY
                  </Text>
                  <Text className="text-ink text-[17px] font-extrabold mt-[3px]">
                    {scan.estimated_quantity} {scan.unit}
                  </Text>
                </View>
                <View className="flex-1 bg-surface-muted border border-border rounded-md p-[12px]">
                  <Text className="text-muted text-[10px] font-extrabold tracking-[0.8px]">
                    ESTIMATED VALUE
                  </Text>
                  <Text className="text-leaf-dark text-[17px] font-extrabold mt-[3px]">
                    ৳{parseFloat(scan.estimated_value_bdt).toFixed(2)}
                  </Text>
                </View>
              </View>

              {scan.is_ewaste_hazard ? (
                <View className="flex-row items-center gap-[8px] bg-danger-soft border border-danger rounded-md p-[12px] mb-[14px]">
                  <Ionicons name="warning" size={18} color={colors.danger} />
                  <Text className="text-danger text-[12px] font-bold flex-1">
                    Regulated E-waste hazard · Mandatory verified recycler route enforced
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
});
