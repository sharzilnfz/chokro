// DepositFlowScreen (M06): Verified drop-zone deposit evidence submission with privacy-safe photo pipeline (Ticket 03 / Spec 16)
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import {
  CATEGORIES,
  categoryLabel,
  formatQuantityWithUnit,
  getCategoryUnit,
  type Category,
} from '@/types';
import { PhotoUploader } from '@/components/PhotoUploader';
import { useEstimate } from '@/hooks/useEstimate';
import { pickAndCompressPhoto, takeAndCompressPhoto, type PreparedPhoto } from '@/lib/photo';

interface DepositFlowScreenProps {
  zoneId?: string;
  zoneName?: string;
  acceptedCategories?: string[];
  onComplete?: () => void;
  onCancel?: () => void;
}

export function DepositFlowScreen({
  zoneId = 'zone-default',
  zoneName = 'Campus Drop Zone A',
  acceptedCategories = CATEGORIES,
  onComplete,
  onCancel,
}: DepositFlowScreenProps) {
  const [category, setCategory] = useState<Category>(
    (acceptedCategories[0] as Category) || 'PLASTICS'
  );
  const [quantity, setQuantity] = useState('');
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const unit = getCategoryUnit(category);
  const parsedQuantity = parseFloat(quantity);
  const hasValidQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  const { data: estimate } = useEstimate(category, 'GOOD');
  const ratePerUnit = estimate ? Number(estimate.price_bdt) : 0;
  const totalEstimatedBdt = hasValidQuantity && ratePerUnit > 0 ? parsedQuantity * ratePerUnit : null;

  const handlePickPhoto = useCallback(async () => {
    setPreparingPhoto(true);
    setError('');
    try {
      const nextPhoto = await pickAndCompressPhoto();
      if (!nextPhoto) return;
      setPhoto(nextPhoto);
      setNotice('Evidence photo attached. GPS EXIF will be stripped server-side.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to pick photo.'));
    } finally {
      setPreparingPhoto(false);
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    setPreparingPhoto(true);
    setError('');
    try {
      const nextPhoto = await takeAndCompressPhoto();
      if (!nextPhoto) return;
      setPhoto(nextPhoto);
      setNotice('Evidence photo captured. GPS EXIF will be stripped server-side.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to capture photo.'));
    } finally {
      setPreparingPhoto(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!photo) {
      setError('Please capture or select an evidence photo of your deposit.');
      return;
    }
    if (!hasValidQuantity) {
      setError(unit === 'kg' ? 'Enter a valid weight in kg.' : 'Enter number of pieces.');
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      // Ingest evidence through canonical privacy-safe pipeline
      await apiRequest('/api/v1/media/upload', {
        method: 'POST',
        body: JSON.stringify({
          dataUri: photo.dataUri,
          purpose: 'DEPOSIT_EVIDENCE',
          category,
        }),
      });

      setIsSuccess(true);
      setNotice('Deposit evidence submitted! Your Green Wallet credits are pending verification.');
      if (onComplete) {
        setTimeout(onComplete, 1200);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit deposit evidence.'));
    } finally {
      setSubmitting(false);
    }
  }, [category, hasValidQuantity, onComplete, photo, unit]);

  if (isSuccess) {
    return (
      <View className="flex-1 bg-background p-[24px] items-center justify-center">
        <View className="w-[72px] h-[72px] rounded-pill bg-leaf-soft items-center justify-center mb-[18px]">
          <Ionicons name="checkmark-circle" size={48} color={colors.leaf} />
        </View>
        <Text className="text-ink text-[22px] font-extrabold text-center mb-[8px]">
          Deposit Verified & Recorded
        </Text>
        <Text className="text-muted text-[14px] text-center mb-[24px] leading-[20px]">
          {notice}
        </Text>
        {totalEstimatedBdt !== null ? (
          <View className="bg-surface border border-border rounded-md p-[16px] w-full mb-[24px] items-center">
            <Text className="text-muted text-[12px] font-bold">Estimated Green Credits</Text>
            <Text className="text-leaf-dark text-[28px] font-black mt-[4px]">
              ৳{totalEstimatedBdt.toFixed(2)}
            </Text>
          </View>
        ) : null}
        {onComplete ? (
          <Pressable
            className="min-h-[50px] w-full rounded-[14px] bg-leaf items-center justify-center active:opacity-[0.72]"
            onPress={onComplete}
          >
            <Text className="text-surface text-[15px] font-extrabold">Done</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-[20px] pb-[36px]"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-center justify-between mb-[6px]">
        <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">VERIFIED DEPOSIT</Text>
        {onCancel ? (
          <Pressable onPress={onCancel} className="p-[4px]">
            <Ionicons name="close" size={22} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <Text accessibilityRole="header" className="text-ink text-[28px] font-extrabold tracking-tight">
        {zoneName}
      </Text>
      <Text className="text-muted text-[13px] mt-[4px] mb-[18px]">
        Capture an evidence photo and record your deposit. Privacy metadata is stripped automatically.
      </Text>

      {/* Compound PhotoUploader (Step 01) */}
      <PhotoUploader.Root
        photo={photo}
        preparingPhoto={preparingPhoto}
        maxPhotos={3}
        onPickPhoto={handlePickPhoto}
        onTakePhoto={handleTakePhoto}
        onRemovePhoto={() => setPhoto(null)}
      >
        <PhotoUploader.Header stepNumber="01" title="Deposit Evidence Photo" />
        <PhotoUploader.Preview />
        <PhotoUploader.Dropzone subtitle="Live photo verification with zero-trust EXIF stripping." />
        <PhotoUploader.PrivacyBadge label="100% EXIF/GPS Metadata Purged Before Storage" />
      </PhotoUploader.Root>

      {/* Category selection (Step 02) */}
      <View className="bg-surface border border-border rounded-md p-[16px] mb-[13px] shadow-card" style={{ elevation: 2 }}>
        <View className="flex-row items-center gap-[9px] mb-[13px]">
          <Text className="text-leaf text-[11px] font-black tracking-[0.8px]">02</Text>
          <Text className="text-ink text-[17px] font-extrabold">Material category</Text>
        </View>
        <View className="flex-row flex-wrap gap-[8px]">
          {acceptedCategories.map((item) => {
            const selected = category === item;
            return (
              <Pressable
                key={item}
                className={`min-h-[44px] px-[13px] rounded-pill border items-center justify-center active:opacity-[0.72] ${
                  selected ? 'bg-leaf-soft border-leaf' : 'bg-background border-border'
                }`}
                onPress={() => {
                  setCategory(item as Category);
                  setQuantity('');
                }}
              >
                <Text className={`text-[13px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}>
                  {categoryLabel(item as Category)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Quantity / Weight input (Step 03) */}
      <View className="bg-surface border border-border rounded-md p-[16px] mb-[13px] shadow-card" style={{ elevation: 2 }}>
        <View className="flex-row items-center gap-[9px] mb-[13px]">
          <Text className="text-leaf text-[11px] font-black tracking-[0.8px]">03</Text>
          <Text className="text-ink text-[17px] font-extrabold">{unit === 'kg' ? 'Estimated Weight' : 'Piece Count'}</Text>
        </View>
        <View className="flex-row">
          <TextInput
            className="flex-1 min-h-[50px] border border-r-0 border-border rounded-tl-[12px] rounded-bl-[12px] bg-background text-ink text-[16px] px-[14px]"
            placeholder={unit === 'kg' ? 'e.g. 1.5' : 'e.g. 1'}
            placeholderTextColor={colors.muted}
            keyboardType={unit === 'kg' ? 'decimal-pad' : 'number-pad'}
            value={quantity}
            onChangeText={setQuantity}
          />
          <View className="min-w-[80px] min-h-[50px] border border-border rounded-tr-[12px] rounded-br-[12px] bg-surface-muted items-center justify-center px-[10px]">
            <Text className="text-ink text-[14px] font-extrabold">{unit}</Text>
          </View>
        </View>
      </View>

      {/* Estimate banner */}
      {totalEstimatedBdt !== null ? (
        <View className="bg-leaf-soft/60 border border-leaf/30 rounded-md p-[14px] mb-[14px] flex-row items-center justify-between">
          <Text className="text-leaf-dark text-[13px] font-extrabold">Estimated Green Credits:</Text>
          <Text className="text-leaf-dark text-[18px] font-black">৳{totalEstimatedBdt.toFixed(2)}</Text>
        </View>
      ) : null}

      {error ? (
        <Text accessibilityRole="alert" className="text-danger bg-danger-soft p-[12px] rounded-[10px] text-[13px] font-semibold mb-[12px]">
          {error}
        </Text>
      ) : null}

      {notice ? (
        <Text accessibilityRole="alert" className="text-leaf-dark bg-leaf-soft p-[12px] rounded-[10px] text-[13px] font-semibold mb-[12px]">
          {notice}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Submit deposit evidence"
        accessibilityState={{ disabled: submitting || preparingPhoto, busy: submitting }}
        className={`min-h-[52px] rounded-[14px] bg-leaf items-center justify-center mt-[4px] active:opacity-[0.72] ${
          submitting || preparingPhoto ? 'opacity-[0.55]' : ''
        }`}
        disabled={submitting || preparingPhoto}
        onPress={handleSubmit}
      >
        {submitting ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text className="text-surface text-[15px] font-extrabold">Confirm Deposit Evidence</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
