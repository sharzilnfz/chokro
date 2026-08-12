import React from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { PreparedPhoto } from '@/lib/photo';

export interface PhotoUploaderProps {
  photo: PreparedPhoto | null;
  preparingPhoto: boolean;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
}

export function PhotoUploader({
  photo,
  preparingPhoto,
  onPickPhoto,
  onRemovePhoto,
}: PhotoUploaderProps) {
  return (
    <View className="bg-surface border border-border rounded-md p-[16px] mb-[13px] shadow-card" style={{ elevation: 2 }}>
      <View className="flex-row items-center gap-[9px] mb-[13px]">
        <Text className="text-leaf text-[11px] font-black tracking-[0.8px]">01</Text>
        <Text className="text-ink text-[17px] font-extrabold">Item photo</Text>
      </View>

      {photo ? (
        <View className="h-[220px] rounded-[14px] overflow-hidden bg-surface-muted">
          <Image
            source={{ uri: photo.previewUri }}
            className="w-full h-full"
            style={{ resizeMode: 'cover' }}
            accessibilityLabel="Selected item photo"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove selected photo"
            className="absolute top-[8px] right-[8px] w-[48px] h-[48px] rounded-[24px] bg-overlay items-center justify-center active:opacity-[0.72]"
            onPress={onRemovePhoto}
          >
            <Ionicons name="close" size={22} color={colors.surface} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose item photo"
          accessibilityState={{ busy: preparingPhoto }}
          className="min-h-[150px] border border-dashed border-leaf rounded-[14px] bg-leaf-soft items-center justify-center p-[18px] active:opacity-[0.72]"
          disabled={preparingPhoto}
          onPress={onPickPhoto}
        >
          {preparingPhoto ? (
            <ActivityIndicator color={colors.leaf} />
          ) : (
            <Ionicons name="image-outline" size={29} color={colors.leaf} />
          )}
          <Text className="text-leaf-dark text-[16px] font-extrabold mt-[7px]">
            {preparingPhoto ? 'Preparing photo...' : 'Choose from photos'}
          </Text>
          <Text className="text-muted text-[12px] leading-[18px] text-center mt-[4px]">
            Downscaled to 1600 px or less and compressed below 500 KB.
          </Text>
        </Pressable>
      )}
    </View>
  );
}
