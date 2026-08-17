import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '@/theme';

export function confidenceColor(confidence: number): { solid: string; soft: string } {
  if (confidence >= 0.7) return { solid: colors.leaf, soft: colors.leafSoft };
  if (confidence >= 0.5) return { solid: colors.amber, soft: colors.amberSoft };
  return { solid: colors.danger, soft: colors.dangerSoft };
}

export const ConfidenceMeter = React.memo(function ConfidenceMeter({
  confidence,
}: {
  confidence: number;
}) {
  const clamped = Math.min(1, Math.max(0, confidence));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: 750 });
  }, [clamped, progress]);

  // GPU-accelerated transform: scaleX & opacity
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0.02, progress.value) }],
    opacity: progress.value > 0 ? 1 : 0,
  }));

  const confTheme = confidenceColor(clamped);

  return (
    <View accessibilityLabel={`AI confidence ${Math.round(clamped * 100)} percent`}>
      <View className="h-[10px] rounded-pill bg-surface-muted overflow-hidden relative">
        <Animated.View
          style={[
            fillStyle,
            {
              width: '100%',
              height: '100%',
              backgroundColor: confTheme.solid,
              transformOrigin: 'left center',
            },
          ]}
        />
      </View>
      <View className="flex-row justify-between mt-[5px]">
        <Text className="text-muted text-[11px] font-bold tracking-[0.4px]">AI CONFIDENCE</Text>
        <Text className="text-[11px] font-extrabold" style={{ color: confTheme.solid }}>
          {Math.round(clamped * 100)}%
        </Text>
      </View>
    </View>
  );
});
