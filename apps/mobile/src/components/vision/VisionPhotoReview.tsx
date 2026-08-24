import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { PreparedPhoto } from '@/lib/photo';
import type { Category } from '@/types';
import { VisionAnalyzingOverlay } from '@/components/vision/VisionAnalyzingOverlay';
import { VisionQuantityGuide } from '@/components/vision/VisionQuantityGuide';

export interface VisionPhotoReviewProps {
  photo: PreparedPhoto;
  isAnalyzing: boolean;
  knowsQty: boolean;
  onToggleKnowsQty: () => void;
  qtyCategory: Category;
  onChangeQtyCategory: (category: Category) => void;
  qtyText: string;
  onChangeQtyText: (text: string) => void;
  onResetScan: () => void;
  onAnalyzePhoto: () => void;
}

const PREVIEW_HEIGHT = 300;

export const VisionPhotoReview = React.memo(function VisionPhotoReview({
  photo,
  isAnalyzing,
  knowsQty,
  onToggleKnowsQty,
  qtyCategory,
  onChangeQtyCategory,
  qtyText,
  onChangeQtyText,
  onResetScan,
  onAnalyzePhoto,
}: VisionPhotoReviewProps) {
  return (
    <View>
      <View
        className="rounded-lg overflow-hidden bg-ink shadow-card"
        style={{ elevation: 2, height: PREVIEW_HEIGHT }}
      >
        <Image
          source={{ uri: photo.previewUri }}
          className="flex-1"
          style={{ resizeMode: 'cover' }}
          accessibilityLabel="Photo pending AI analysis"
        />
        <VisionAnalyzingOverlay isAnalyzing={isAnalyzing} />
      </View>

      {!isAnalyzing ? (
        <View>
          <VisionQuantityGuide
            knowsQty={knowsQty}
            onToggleKnowsQty={onToggleKnowsQty}
            qtyCategory={qtyCategory}
            onChangeQtyCategory={onChangeQtyCategory}
            qtyText={qtyText}
            onChangeQtyText={onChangeQtyText}
          />

          <View className="flex-row gap-[10px] mt-[14px]">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retake photo"
              className="flex-1 min-h-[52px] rounded-[14px] border border-border bg-surface items-center justify-center active:opacity-[0.72]"
              onPress={onResetScan}
            >
              <Text className="text-ink text-[15px] font-bold">Retake</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Analyze photo with AI"
              className="flex-1 min-h-[52px] rounded-[14px] bg-leaf items-center justify-center active:opacity-[0.72] flex-row gap-[6px]"
              onPress={onAnalyzePhoto}
            >
              <Ionicons name="sparkles" size={17} color={colors.surface} />
              <Text className="text-surface text-[15px] font-extrabold">Analyze</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
});
