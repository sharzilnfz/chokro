// Compound PhotoUploader: zero-trust privacy-safe media uploader component (Ticket 03 / Spec 16)
import React, { createContext, useContext } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { PreparedPhoto } from '@/lib/photo';

interface PhotoUploaderContextType {
  photos: PreparedPhoto[];
  preparingPhoto: boolean;
  maxPhotos: number;
  onPickPhoto: () => void;
  onTakePhoto?: () => void;
  onRemovePhoto: (index?: number) => void;
}

const PhotoUploaderContext = createContext<PhotoUploaderContextType | null>(null);

function usePhotoUploader() {
  const context = useContext(PhotoUploaderContext);
  if (!context) {
    throw new Error('PhotoUploader subcomponents must be rendered within a PhotoUploader.Root');
  }
  return context;
}

// 1. Root Component / Provider
export interface PhotoUploaderRootProps {
  children: React.ReactNode;
  photos?: PreparedPhoto[] | null;
  photo?: PreparedPhoto | null;
  preparingPhoto?: boolean;
  maxPhotos?: number;
  onPickPhoto: () => void;
  onTakePhoto?: () => void;
  onRemovePhoto: (index?: number) => void;
  className?: string;
}

export function PhotoUploaderRoot({
  children,
  photos,
  photo,
  preparingPhoto = false,
  maxPhotos = 3,
  onPickPhoto,
  onTakePhoto,
  onRemovePhoto,
  className = '',
}: PhotoUploaderRootProps) {
  const normalizedPhotos: PreparedPhoto[] = photos
    ? photos
    : photo
    ? [photo]
    : [];

  return (
    <PhotoUploaderContext.Provider
      value={{
        photos: normalizedPhotos,
        preparingPhoto,
        maxPhotos,
        onPickPhoto,
        onTakePhoto,
        onRemovePhoto,
      }}
    >
      <View
        className={`bg-surface border border-border rounded-md p-[16px] mb-[13px] shadow-card ${className}`}
        style={{ elevation: 2 }}
      >
        {children}
      </View>
    </PhotoUploaderContext.Provider>
  );
}

// 2. Header Component
export interface PhotoUploaderHeaderProps {
  stepNumber?: string;
  title?: string;
  quotaLabel?: string;
}

export function PhotoUploaderHeader({
  stepNumber = '01',
  title = 'Item photos',
  quotaLabel,
}: PhotoUploaderHeaderProps) {
  const { photos, maxPhotos } = usePhotoUploader();
  return (
    <View className="flex-row items-center justify-between mb-[13px]">
      <View className="flex-row items-center gap-[9px]">
        <Text className="text-leaf text-[11px] font-black tracking-[0.8px]">{stepNumber}</Text>
        <Text className="text-ink text-[17px] font-extrabold">{title}</Text>
      </View>
      <Text className="text-muted text-[12px] font-bold">
        {quotaLabel || `${photos.length} / ${maxPhotos} max`}
      </Text>
    </View>
  );
}

// 3. Privacy Badge Component
export interface PhotoUploaderPrivacyBadgeProps {
  label?: string;
}

export function PhotoUploaderPrivacyBadge({
  label = '100% EXIF Stripped • Zero-Trust Privacy Protected',
}: PhotoUploaderPrivacyBadgeProps) {
  return (
    <View className="flex-row items-center gap-[6px] bg-leaf-soft/70 px-[10px] py-[6px] rounded-pill mt-[10px] self-start border border-leaf/30">
      <Ionicons name="shield-checkmark" size={14} color={colors.leafDark || '#1b5e20'} />
      <Text className="text-leaf-dark text-[11px] font-bold tracking-tight">{label}</Text>
    </View>
  );
}

// 4. Dropzone / Trigger Component
export interface PhotoUploaderDropzoneProps {
  subtitle?: string;
  allowCamera?: boolean;
}

export function PhotoUploaderDropzone({
  subtitle = 'EXIF GPS metadata is automatically stripped server-side.',
  allowCamera = true,
}: PhotoUploaderDropzoneProps) {
  const { photos, maxPhotos, preparingPhoto, onPickPhoto, onTakePhoto } = usePhotoUploader();

  if (photos.length >= maxPhotos) {
    return null;
  }

  return (
    <View className="border border-dashed border-leaf rounded-[14px] bg-leaf-soft items-center justify-center p-[18px]">
      {preparingPhoto ? (
        <View className="py-[12px] items-center justify-center">
          <ActivityIndicator color={colors.leaf} size="small" />
          <Text className="text-leaf-dark text-[14px] font-extrabold mt-[8px]">
            Preparing photo...
          </Text>
        </View>
      ) : (
        <View className="w-full items-center">
          <Ionicons name="camera-outline" size={32} color={colors.leaf} />
          <Text className="text-leaf-dark text-[16px] font-extrabold mt-[6px]">
            Add evidence or item photo
          </Text>
          <Text className="text-muted text-[12px] leading-[18px] text-center mt-[4px] mb-[12px]">
            {subtitle}
          </Text>
          <View className="flex-row gap-[10px] mt-[2px]">
            {allowCamera && onTakePhoto ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Take a photo with camera"
                className="flex-row items-center gap-[6px] min-h-[44px] px-[16px] rounded-[10px] bg-leaf items-center justify-center active:opacity-[0.72]"
                onPress={onTakePhoto}
              >
                <Ionicons name="camera" size={16} color={colors.surface} />
                <Text className="text-surface text-[13px] font-extrabold">Camera</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose photo from gallery"
              className="flex-row items-center gap-[6px] min-h-[44px] px-[16px] rounded-[10px] bg-surface border border-border items-center justify-center active:opacity-[0.72]"
              onPress={onPickPhoto}
            >
              <Ionicons name="images-outline" size={16} color={colors.ink} />
              <Text className="text-ink text-[13px] font-extrabold">Gallery</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// 5. Preview & Thumbnail List Component
export function PhotoUploaderPreview() {
  const { photos, onRemovePhoto } = usePhotoUploader();

  if (photos.length === 0) return null;

  if (photos.length === 1) {
    const single = photos[0];
    return (
      <View className="h-[220px] rounded-[14px] overflow-hidden bg-surface-muted relative mb-[8px]">
        <Image
          source={{ uri: single.previewUri }}
          className="w-full h-full"
          style={{ resizeMode: 'cover' }}
          accessibilityLabel="Selected item photo"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove selected photo"
          className="absolute top-[8px] right-[8px] w-[40px] h-[40px] rounded-[20px] bg-overlay items-center justify-center active:opacity-[0.72]"
          onPress={() => onRemovePhoto(0)}
        >
          <Ionicons name="close" size={20} color={colors.surface} />
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-[10px] mb-[10px]">
      {photos.map((item, index) => (
        <View
          key={`${item.previewUri}-${index}`}
          className="w-[96px] h-[96px] rounded-[12px] overflow-hidden bg-surface-muted relative border border-border"
        >
          <Image
            source={{ uri: item.previewUri }}
            className="w-full h-full"
            style={{ resizeMode: 'cover' }}
            accessibilityLabel={`Uploaded photo ${index + 1}`}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove photo ${index + 1}`}
            className="absolute top-[4px] right-[4px] w-[26px] h-[26px] rounded-[13px] bg-overlay items-center justify-center active:opacity-[0.72]"
            onPress={() => onRemovePhoto(index)}
          >
            <Ionicons name="close" size={14} color={colors.surface} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// 6. Compound <PhotoUploader> All-in-One Component
export interface PhotoUploaderProps {
  photo?: PreparedPhoto | null;
  photos?: PreparedPhoto[] | null;
  preparingPhoto: boolean;
  maxPhotos?: number;
  onPickPhoto: () => void;
  onTakePhoto?: () => void;
  onRemovePhoto: (index?: number) => void;
  stepNumber?: string;
  title?: string;
  showPrivacyBadge?: boolean;
}

export function PhotoUploader({
  photo,
  photos,
  preparingPhoto,
  maxPhotos = 3,
  onPickPhoto,
  onTakePhoto,
  onRemovePhoto,
  stepNumber = '01',
  title = 'Item photo',
  showPrivacyBadge = true,
}: PhotoUploaderProps) {
  return (
    <PhotoUploaderRoot
      photo={photo}
      photos={photos}
      preparingPhoto={preparingPhoto}
      maxPhotos={maxPhotos}
      onPickPhoto={onPickPhoto}
      onTakePhoto={onTakePhoto}
      onRemovePhoto={onRemovePhoto}
    >
      <PhotoUploaderHeader stepNumber={stepNumber} title={title} />
      <PhotoUploaderPreview />
      <PhotoUploaderDropzone />
      {showPrivacyBadge ? <PhotoUploaderPrivacyBadge /> : null}
    </PhotoUploaderRoot>
  );
}

// Attach subcomponents to PhotoUploader for compound usage:
// <PhotoUploader.Root> ... <PhotoUploader.Header /> ... </PhotoUploader.Root>
PhotoUploader.Root = PhotoUploaderRoot;
PhotoUploader.Header = PhotoUploaderHeader;
PhotoUploader.Dropzone = PhotoUploaderDropzone;
PhotoUploader.Preview = PhotoUploaderPreview;
PhotoUploader.PrivacyBadge = PhotoUploaderPrivacyBadge;
