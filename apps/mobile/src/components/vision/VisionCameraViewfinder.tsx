import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CameraView, type PermissionResponse } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export interface VisionCameraViewfinderProps {
  cameraRef: React.RefObject<CameraView | null>;
  permission: PermissionResponse | null;
  onRequestPermission: () => Promise<PermissionResponse>;
  onCapture: () => void;
  onChooseGallery: () => void;
  isCapturing: boolean;
  isPickingGallery: boolean;
}

const SCAN_FRAME_WIDTH = 220;
const SCAN_FRAME_HEIGHT = 180;

export const VisionCameraViewfinder = React.memo(function VisionCameraViewfinder({
  cameraRef,
  permission,
  onRequestPermission,
  onCapture,
  onChooseGallery,
  isCapturing,
  isPickingGallery,
}: VisionCameraViewfinderProps) {
  if (!permission) {
    return (
      <View
        className="h-[300px] rounded-lg bg-surface-muted items-center justify-center"
        accessibilityLiveRegion="polite"
      >
        <ActivityIndicator color={colors.leaf} />
        <Text className="text-muted text-[13px] mt-[9px]">Checking camera permission</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        className="min-h-[260px] border border-border rounded-lg bg-surface items-center justify-center p-[24px] shadow-card"
        style={{ elevation: 2 }}
      >
        <Ionicons name="camera-outline" size={32} color={colors.leaf} />
        <Text className="text-ink text-[18px] font-extrabold mt-[10px]">Camera permission needed</Text>
        <Text className="text-muted text-[13px] leading-[20px] text-center mt-[6px] mb-[15px]">
          Chokro uses the camera to inspect and evaluate your scrap item for instant AI valuation.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Allow camera access"
          className="min-w-[170px] min-h-[50px] rounded-[14px] bg-leaf items-center justify-center active:opacity-[0.72]"
          onPress={() => void onRequestPermission()}
        >
          <Text className="text-surface text-[15px] font-extrabold">Allow camera</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose a photo from the gallery instead"
          accessibilityState={{ disabled: isPickingGallery, busy: isPickingGallery }}
          className={`min-w-[170px] min-h-[46px] rounded-[14px] bg-background border border-border items-center justify-center mt-[9px] active:opacity-[0.72] ${
            isPickingGallery ? 'opacity-[0.6]' : ''
          }`}
          disabled={isPickingGallery}
          onPress={onChooseGallery}
        >
          {isPickingGallery ? (
            <ActivityIndicator color={colors.leaf} size="small" />
          ) : (
            <Text className="text-ink text-[14px] font-bold">Use a gallery photo</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View className="rounded-lg overflow-hidden bg-ink shadow-card" style={{ elevation: 2 }}>
      <View style={{ height: 340 }}>
        <CameraView
          ref={cameraRef}
          className="flex-1"
          facing="back"
          accessibilityLabel="Scrap camera viewfinder"
        />
        {/* Targeting reticle */}
        <View
          pointerEvents="none"
          className="absolute top-0 right-0 bottom-0 left-0 items-center justify-center bg-[#0a160f]/16"
        >
          <View
            className="items-center justify-center"
            style={{ width: SCAN_FRAME_WIDTH + 40, height: SCAN_FRAME_HEIGHT + 40 }}
          >
            <View
              className="border-[3px] border-surface/90 rounded-[22px]"
              style={{ width: SCAN_FRAME_WIDTH, height: SCAN_FRAME_HEIGHT }}
            />
            <Text className="absolute bottom-[10px] text-surface text-[12px] font-extrabold bg-overlay px-[12px] py-[8px] rounded-pill overflow-hidden">
              Fill the frame with one item
            </Text>
          </View>
        </View>

        {/* Shutter controls */}
        <View
          pointerEvents="box-none"
          className="absolute bottom-[14px] left-0 right-0 flex-row items-center justify-between px-[26px]"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose a photo from the gallery instead"
            accessibilityState={{ disabled: isPickingGallery, busy: isPickingGallery }}
            className={`w-[52px] h-[52px] rounded-[26px] bg-overlay items-center justify-center active:opacity-[0.72] ${
              isPickingGallery ? 'opacity-[0.6]' : ''
            }`}
            disabled={isPickingGallery}
            onPress={onChooseGallery}
          >
            {isPickingGallery ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Ionicons name="images-outline" size={22} color={colors.surface} />
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capture photo for AI analysis"
            accessibilityState={{ disabled: isCapturing, busy: isCapturing }}
            className={`w-[68px] h-[68px] rounded-[34px] border-[4px] border-surface bg-leaf items-center justify-center active:opacity-[0.72] ${
              isCapturing ? 'opacity-[0.6]' : ''
            }`}
            disabled={isCapturing}
            onPress={onCapture}
          >
            {isCapturing ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Ionicons name="camera" size={28} color={colors.surface} />
            )}
          </Pressable>

          <View accessibilityElementsHidden className="w-[52px] h-[52px]" />
        </View>
      </View>
    </View>
  );
});
