import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export interface VisionAnalyzingOverlayProps {
  isAnalyzing: boolean;
}

const SCAN_FRAME_WIDTH = 220;
const SCAN_FRAME_HEIGHT = 180;
const SCAN_LINE_TRAVEL = 140;

const ANALYSIS_STAGES = [
  'Reading the photo…',
  'Detecting category & condition…',
  "Matching today's rate card…",
  'Choosing the next-life path…',
];

export const VisionAnalyzingOverlay = React.memo(function VisionAnalyzingOverlay({
  isAnalyzing,
}: VisionAnalyzingOverlayProps) {
  const scanProgress = useSharedValue(0);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (isAnalyzing) {
      scanProgress.value = 0;
      scanProgress.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [isAnalyzing, scanProgress]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanProgress.value * SCAN_LINE_TRAVEL }],
  }));

  useEffect(() => {
    if (!isAnalyzing) {
      setStage(0);
      return;
    }
    const timer = setInterval(() => {
      setStage((current) => Math.min(current + 1, ANALYSIS_STAGES.length - 1));
    }, 1100);
    return () => clearInterval(timer);
  }, [isAnalyzing]);

  if (!isAnalyzing) return null;

  return (
    <View className="absolute top-0 right-0 bottom-0 left-0 bg-overlay items-center justify-center">
      <View
        className="items-center justify-center"
        style={{ width: SCAN_FRAME_WIDTH + 40, height: SCAN_FRAME_HEIGHT + 40 }}
      >
        <View
          className="border-[3px] border-surface/90 rounded-[22px] overflow-hidden"
          style={{ width: SCAN_FRAME_WIDTH, height: SCAN_FRAME_HEIGHT }}
        >
          <Animated.View
            pointerEvents="none"
            style={[scanLineStyle]}
            className="absolute left-[8px] right-[8px] top-[8px] h-[3px] rounded-pill bg-leaf"
          />
        </View>
        <Ionicons
          name="sparkles"
          size={26}
          color={colors.leaf}
          style={{ position: 'absolute', top: -34 }}
        />
      </View>
      <View className="absolute bottom-0 left-0 right-0 items-center pb-[16px] pt-[12px] bg-[#0a160f]/70">
        <Animated.Text
          key={stage}
          entering={FadeInUp.duration(240)}
          className="text-surface text-[13px] font-extrabold"
          accessibilityLiveRegion="polite"
        >
          {ANALYSIS_STAGES[stage]}
        </Animated.Text>
        <Text className="text-surface/70 text-[11px] font-semibold mt-[3px]">
          Chokro Vision AI · usually under 5 seconds
        </Text>
      </View>
    </View>
  );
});
