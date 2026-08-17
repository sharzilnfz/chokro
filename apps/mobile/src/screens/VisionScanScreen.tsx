import React, { useCallback, useRef, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { getCategoryUnit, type Category, type ListingPrefill } from '@/types';
import { compressPhoto, pickAndCompressPhoto, type PreparedPhoto } from '@/lib/photo';
import { useVisionScan } from '@/hooks/useVisionScan';
import { useScanHistory } from '@/hooks/useScanHistory';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { VisionCameraViewfinder } from '@/components/vision/VisionCameraViewfinder';
import { VisionPhotoReview } from '@/components/vision/VisionPhotoReview';
import { VisionHistorySection } from '@/components/vision/VisionHistorySection';
import { VisionScanHistoryModal } from '@/components/vision/VisionScanHistoryModal';
import { VisionResultCard } from '@/components/VisionResultCard';

export interface VisionScanScreenProps {
  onListScrap: (prefill: ListingPrefill) => void;
}

export function VisionScanScreen({ onListScrap }: VisionScanScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [pickingGallery, setPickingGallery] = useState(false);
  const [error, setError] = useState('');
  const [knowsQty, setKnowsQty] = useState(false);
  const [qtyText, setQtyText] = useState('');
  const [qtyCategory, setQtyCategory] = useState<Category>('PLASTICS');
  const [openScanId, setOpenScanId] = useState<string | null>(null);

  const visionScan = useVisionScan();
  const analyzing = visionScan.isPending;
  const result = visionScan.data ?? null;

  const history = useScanHistory(10);
  const declaredQtyNumber = knowsQty ? parseFloat(qtyText) : NaN;
  const hasDeclaredQty = Number.isFinite(declaredQtyNumber) && declaredQtyNumber > 0;

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    setError('');
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      const prepared = await compressPhoto({
        uri: picture.uri,
        width: picture.width ?? 0,
        height: picture.height ?? 0,
      });
      setPhoto(prepared);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Could not capture this photo.'));
    } finally {
      setCapturing(false);
    }
  }, [capturing]);

  const chooseFromGallery = useCallback(async () => {
    setPickingGallery(true);
    setError('');
    try {
      const prepared = await pickAndCompressPhoto();
      if (prepared) setPhoto(prepared);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Could not prepare this photo.'));
    } finally {
      setPickingGallery(false);
    }
  }, []);

  const analyzePhoto = useCallback(() => {
    if (!photo || analyzing) return;
    setError('');
    visionScan.reset();
    visionScan.mutate({
      imageBase64: photo.dataUri,
      ...(hasDeclaredQty ? { declaredQuantity: declaredQtyNumber, categoryHint: qtyCategory } : {}),
    });
  }, [analyzing, declaredQtyNumber, hasDeclaredQty, photo, qtyCategory, visionScan]);

  const resetScan = useCallback(() => {
    setPhoto(null);
    setError('');
    setKnowsQty(false);
    setQtyText('');
    visionScan.reset();
  }, [visionScan]);

  const buildPrefill = useCallback((): ListingPrefill => {
    const category = result!.classification.category;
    const condition = result!.classification.condition;
    const unit = getCategoryUnit(category);
    const rawQuantity = hasDeclaredQty ? declaredQtyNumber : result!.classification.quantity;
    const quantity =
      unit === 'piece' ? Math.max(1, Math.round(rawQuantity)) : Math.round(rawQuantity * 10) / 10;
    return { category, condition, unit, quantity, photo, seededAt: Date.now() };
  }, [declaredQtyNumber, hasDeclaredQty, photo, result]);

  const listThisScrap = useCallback(() => {
    if (!result) return;
    onListScrap(buildPrefill());
  }, [buildPrefill, onListScrap, result]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel="AI scrap scanner"
        refreshControl={
          <RefreshControl
            refreshing={history.isFetching && !history.isLoading}
            onRefresh={() => void history.refetch()}
            tintColor={colors.leaf}
            colors={[colors.leaf]}
          />
        }
      >
        <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">
          AI NEXT-LIFE VISION
        </Text>
        <Text
          accessibilityRole="header"
          className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]"
        >
          Scan your scrap
        </Text>
        <Text className="text-muted text-[14px] leading-[21px] mt-[6px] mb-[18px]">
          Point at one item. Chokro Vision AI detects the category, condition and today&apos;s value
          — then suggests its best next life.
        </Text>

        {error ? <ErrorBanner message={error} /> : null}
        {visionScan.isError ? (
          <ErrorBanner
            message={getErrorMessage(visionScan.error, 'The vision scan failed. Try again.')}
          />
        ) : null}

        {/* Viewfinder when no photo taken */}
        {!photo ? (
          <VisionCameraViewfinder
            cameraRef={cameraRef}
            permission={permission}
            onRequestPermission={requestPermission}
            onCapture={capturePhoto}
            onChooseGallery={chooseFromGallery}
            isCapturing={capturing}
            isPickingGallery={pickingGallery}
          />
        ) : !result ? (
          /* Preview and confirmation state */
          <VisionPhotoReview
            photo={photo}
            isAnalyzing={analyzing}
            knowsQty={knowsQty}
            onToggleKnowsQty={() => setKnowsQty((prev) => !prev)}
            qtyCategory={qtyCategory}
            onChangeQtyCategory={setQtyCategory}
            qtyText={qtyText}
            onChangeQtyText={setQtyText}
            onResetScan={resetScan}
            onAnalyzePhoto={analyzePhoto}
          />
        ) : (
          /* Analysis result */
          <VisionResultCard
            result={result}
            photoPreviewUri={photo.previewUri}
            onListScrap={listThisScrap}
            onScanAgain={resetScan}
          />
        )}

        {/* Scan history section */}
        <VisionHistorySection
          scans={history.data ?? []}
          onOpenScanId={(id) => setOpenScanId(id)}
        />
      </ScrollView>

      {/* History detail modal */}
      <VisionScanHistoryModal openScanId={openScanId} onClose={() => setOpenScanId(null)} />
    </View>
  );
}
