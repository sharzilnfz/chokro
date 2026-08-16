import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import {
  CATEGORIES,
  CONDITIONS,
  categoryLabel,
  formatQuantityWithUnit,
  getCategoryUnit,
  type Category,
  type Condition,
  type ListingPrefill,
} from '@/types';
import { compressPhoto, pickAndCompressPhoto, type PreparedPhoto } from '@/lib/photo';
import { useEstimate } from '@/hooks/useEstimate';
import { useVisionScan } from '@/hooks/useVisionScan';
import { timeAgo, useScanDetail, useScanHistory } from '@/hooks/useScanHistory';
import { EstimatorCard } from '@/components/EstimatorCard';
import { VisionResultCard, confidenceColor, pathVisual } from '@/components/VisionResultCard';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { StateView } from '@/components/ui/StateView';

const PREVIEW_HEIGHT = 300;
const SCAN_FRAME_WIDTH = 220;
const SCAN_FRAME_HEIGHT = 180;
const SCAN_LINE_TRAVEL = 140;

const CATEGORY_ICONS: Record<Category, keyof typeof Ionicons.glyphMap> = {
  CLOTHES: 'shirt-outline',
  BOOKS: 'book-outline',
  PLASTICS: 'water-outline',
  PAPER: 'newspaper-outline',
  METAL: 'cube-outline',
  GLASS: 'wine-outline',
  FURNITURE: 'bed-outline',
  APPLIANCES: 'flash-outline',
  E_WASTE: 'warning-outline',
};

const ANALYSIS_STAGES = [
  'Reading the photo…',
  'Detecting category & condition…',
  "Matching today's rate card…",
  'Choosing the next-life path…',
];

type VisionScanScreenProps = {
  onListScrap: (prefill: ListingPrefill) => void;
};

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
  const [manualCategory, setManualCategory] = useState<Category | null>(null);
  const [manualCondition, setManualCondition] = useState<Condition | null>(null);
  const [openScanId, setOpenScanId] = useState<string | null>(null);

  const visionScan = useVisionScan();
  const analyzing = visionScan.isPending;
  const result = visionScan.data ?? null;
  const lowConfidence = result !== null && result.classification.confidence < 0.5;

  const history = useScanHistory(10);
  const scanDetail = useScanDetail(openScanId);

  const declaredQtyNumber = knowsQty ? parseFloat(qtyText) : NaN;
  const hasDeclaredQty = Number.isFinite(declaredQtyNumber) && declaredQtyNumber > 0;

  const effectiveCategory = manualCategory ?? result?.classification.category ?? 'PLASTICS';
  const effectiveCondition = manualCondition ?? result?.classification.condition ?? 'GOOD';
  const manualUnit = getCategoryUnit(effectiveCategory);
  const manualQuantity = hasDeclaredQty ? declaredQtyNumber : (result?.classification.quantity ?? 0);
  const normalizedManualQuantity =
    manualUnit === 'piece' ? Math.max(1, Math.round(manualQuantity)) : Math.round(manualQuantity * 10) / 10;

  const manualEstimateQuery = useEstimate(
    effectiveCategory,
    effectiveCondition,
    manualUnit === 'kg' ? normalizedManualQuantity : undefined,
    manualUnit === 'piece' ? normalizedManualQuantity : undefined,
    lowConfidence,
  );

  // Animated scan line sweeping across the frame while the model runs.
  const scanProgress = useSharedValue(0);
  useEffect(() => {
    if (analyzing) {
      scanProgress.value = 0;
      scanProgress.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [analyzing, scanProgress]);
  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanProgress.value * SCAN_LINE_TRAVEL }],
  }));

  // Cycling status copy keeps the wait feel alive.
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!analyzing) {
      setStage(0);
      return;
    }
    const timer = setInterval(() => {
      setStage((current) => Math.min(current + 1, ANALYSIS_STAGES.length - 1));
    }, 1100);
    return () => clearInterval(timer);
  }, [analyzing]);

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
    setManualCategory(null);
    setManualCondition(null);
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
    setManualCategory(null);
    setManualCondition(null);
    visionScan.reset();
  }, [visionScan]);

  const buildPrefill = useCallback((): ListingPrefill => {
    const category = lowConfidence ? effectiveCategory : result!.classification.category;
    const condition = lowConfidence ? effectiveCondition : result!.classification.condition;
    const unit = getCategoryUnit(category);
    const rawQuantity = hasDeclaredQty ? declaredQtyNumber : result!.classification.quantity;
    const quantity = unit === 'piece' ? Math.max(1, Math.round(rawQuantity)) : Math.round(rawQuantity * 10) / 10;
    return { category, condition, unit, quantity, photo, seededAt: Date.now() };
  }, [declaredQtyNumber, effectiveCategory, effectiveCondition, hasDeclaredQty, lowConfidence, photo, result]);

  const listThisScrap = useCallback(() => {
    if (!result) return;
    onListScrap(buildPrefill());
  }, [buildPrefill, onListScrap, result]);

  const qtyUnit = getCategoryUnit(qtyCategory);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-[20px] pb-[36px]"
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
        <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">AI NEXT-LIFE VISION</Text>
        <Text accessibilityRole="header" className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]">Scan your scrap</Text>
        <Text className="text-muted text-[14px] leading-[21px] mt-[6px] mb-[18px]">
          Point at one item. Chokro Vision AI detects the category, condition and today&apos;s value — then suggests its best next life.
        </Text>

        {error ? <ErrorBanner message={error} /> : null}
        {visionScan.isError ? (
          <ErrorBanner message={getErrorMessage(visionScan.error, 'The vision scan failed. Try again.')} />
        ) : null}

        {!photo ? (
          !permission ? (
            <View className="h-[300px] rounded-lg bg-surface-muted items-center justify-center" accessibilityLiveRegion="polite">
              <ActivityIndicator color={colors.leaf} />
              <Text className="text-muted text-[13px] mt-[9px]">Checking camera permission</Text>
            </View>
          ) : !permission.granted ? (
            <View className="min-h-[260px] border border-border rounded-lg bg-surface items-center justify-center p-[24px] shadow-card" style={{ elevation: 2 }}>
              <Ionicons name="camera-outline" size={31} color={colors.leaf} />
              <Text className="text-ink text-[18px] font-extrabold mt-[10px]">Camera permission needed</Text>
              <Text className="text-muted text-[13px] leading-[20px] text-center mt-[6px] mb-[15px]">
                Chokro uses the camera only to photograph the scrap item you want valued.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Allow camera access"
                className="min-w-[170px] min-h-[50px] rounded-[14px] bg-leaf items-center justify-center active:opacity-[0.72]"
                onPress={() => void requestPermission()}
              >
                <Text className="text-surface text-[15px] font-extrabold">Allow camera</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose a photo from the gallery instead"
                accessibilityState={{ disabled: pickingGallery, busy: pickingGallery }}
                className={`min-w-[170px] min-h-[46px] rounded-[14px] bg-background border border-border items-center justify-center mt-[9px] active:opacity-[0.72] ${pickingGallery ? 'opacity-[0.6]' : ''}`}
                disabled={pickingGallery}
                onPress={() => void chooseFromGallery()}
              >
                {pickingGallery ? (
                  <ActivityIndicator color={colors.leaf} size="small" />
                ) : (
                  <Text className="text-ink text-[14px] font-bold">Use a gallery photo</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View className="rounded-lg overflow-hidden bg-ink shadow-card" style={{ elevation: 2 }}>
              <View style={{ height: 340 }}>
                <CameraView
                  ref={cameraRef}
                  className="flex-1"
                  facing="back"
                  accessibilityLabel="Scrap camera view"
                />
                <View pointerEvents="none" className="absolute top-0 right-0 bottom-0 left-0 items-center justify-center bg-[#0a160f]/16">
                  <View className="items-center justify-center" style={{ width: SCAN_FRAME_WIDTH + 40, height: SCAN_FRAME_HEIGHT + 40 }}>
                    <View className="w-[220px] h-[180px] border-[3px] border-surface/90 rounded-[22px]" />
                    <Text className="absolute bottom-[10px] text-surface text-[12px] font-extrabold bg-overlay px-[12px] py-[8px] rounded-pill overflow-hidden">
                      Fill the frame with one item
                    </Text>
                  </View>
                </View>
                <View pointerEvents="box-none" className="absolute bottom-[14px] left-0 right-0 flex-row items-center justify-between px-[26px]">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Choose a photo from the gallery instead"
                    accessibilityState={{ disabled: pickingGallery, busy: pickingGallery }}
                    className={`w-[52px] h-[52px] rounded-[26px] bg-overlay items-center justify-center active:opacity-[0.72] ${pickingGallery ? 'opacity-[0.6]' : ''}`}
                    disabled={pickingGallery}
                    onPress={() => void chooseFromGallery()}
                  >
                    {pickingGallery ? (
                      <ActivityIndicator color={colors.surface} size="small" />
                    ) : (
                      <Ionicons name="images-outline" size={22} color={colors.surface} />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Capture photo for AI analysis"
                    accessibilityState={{ disabled: capturing, busy: capturing }}
                    className={`w-[68px] h-[68px] rounded-[34px] border-[4px] border-surface bg-leaf items-center justify-center active:opacity-[0.72] ${capturing ? 'opacity-[0.6]' : ''}`}
                    disabled={capturing}
                    onPress={() => void capturePhoto()}
                  >
                    {capturing ? <ActivityIndicator color={colors.surface} /> : <Ionicons name="camera" size={28} color={colors.surface} />}
                  </Pressable>
                  <View accessibilityElementsHidden className="w-[52px] h-[52px]" />
                </View>
              </View>
            </View>
          )
        ) : !result ? (
          <View>
            <View className="rounded-lg overflow-hidden bg-ink shadow-card" style={{ elevation: 2, height: PREVIEW_HEIGHT }}>
              <Image
                source={{ uri: photo.previewUri }}
                className="flex-1"
                style={{ resizeMode: 'cover' }}
                accessibilityLabel="Photo pending AI analysis"
              />
              {analyzing ? (
                <View className="absolute top-0 right-0 bottom-0 left-0 bg-overlay items-center justify-center">
                  <View className="items-center justify-center" style={{ width: SCAN_FRAME_WIDTH + 40, height: SCAN_FRAME_HEIGHT + 40 }}>
                    <View className="border-[3px] border-surface/90 rounded-[22px] overflow-hidden" style={{ width: SCAN_FRAME_WIDTH, height: SCAN_FRAME_HEIGHT }}>
                      <Animated.View
                        pointerEvents="none"
                        style={[scanLineStyle]}
                        className="absolute left-[8px] right-[8px] top-[8px] h-[3px] rounded-pill bg-leaf"
                      />
                    </View>
                    <Ionicons name="sparkles" size={26} color={colors.leaf} style={{ position: 'absolute', top: -34 }} />
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
                    <Text className="text-surface/70 text-[11px] font-semibold mt-[3px]">Chokro Vision AI · usually under 5 seconds</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {!analyzing ? (
              <View>
                <View className="bg-surface border border-border rounded-md p-[16px] mt-[13px] shadow-card" style={{ elevation: 2 }}>
                  <Pressable
                    accessibilityRole="switch"
                    accessibilityLabel="I know the quantity"
                    accessibilityState={{ checked: knowsQty }}
                    className="flex-row items-center gap-[9px] min-h-[44px] active:opacity-[0.72]"
                    onPress={() => setKnowsQty((next) => !next)}
                  >
                    <Ionicons name={knowsQty ? 'checkbox' : 'square-outline'} size={21} color={knowsQty ? colors.leaf : colors.muted} />
                    <Text className="text-ink text-[15px] font-bold flex-1">I know the quantity</Text>
                    <Text className="text-muted text-[12px] font-semibold">optional</Text>
                  </Pressable>

                  {knowsQty ? (
                    <View className="mt-[6px]">
                      <Text className="text-muted text-[12px] font-bold mb-[8px]">Which scrap is it? This also guides the AI.</Text>
                      <View className="flex-row flex-wrap gap-[7px]">
                        {CATEGORIES.map((item) => {
                          const selected = qtyCategory === item;
                          return (
                            <Pressable
                              key={item}
                              accessibilityRole="radio"
                              accessibilityLabel={categoryLabel(item)}
                              accessibilityState={{ checked: selected }}
                              className={`min-h-[40px] px-[11px] rounded-pill border items-center justify-center active:opacity-[0.72] ${selected ? 'bg-leaf-soft border-leaf' : 'bg-background border-border'}`}
                              onPress={() => setQtyCategory(item)}
                            >
                              <Text className={`text-[12px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}>{categoryLabel(item)}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <View className="flex-row mt-[11px]">
                        <TextInput
                          accessibilityLabel={qtyUnit === 'kg' ? 'Declared weight in kilograms' : 'Declared number of pieces'}
                          className="flex-1 min-h-[50px] border border-r-0 border-border rounded-tl-[12px] rounded-bl-[12px] bg-background text-ink text-[16px] px-[13px]"
                          placeholder={qtyUnit === 'kg' ? 'e.g. 2.5' : 'e.g. 1'}
                          placeholderTextColor={colors.muted}
                          keyboardType={qtyUnit === 'kg' ? 'decimal-pad' : 'number-pad'}
                          value={qtyText}
                          onChangeText={setQtyText}
                        />
                        <View className="min-w-[88px] min-h-[50px] border border-border rounded-tr-[12px] rounded-br-[12px] bg-surface-muted items-center justify-center px-[12px]">
                          <Text className="text-ink text-[14px] font-extrabold">{qtyUnit === 'kg' ? 'kg' : 'pieces'}</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}
                </View>

                <View className="flex-row gap-[9px] mt-[13px]">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Retake photo"
                    className="flex-1 min-h-[54px] rounded-[15px] bg-surface border border-border items-center justify-center active:opacity-[0.72]"
                    onPress={resetScan}
                  >
                    <View className="flex-row items-center gap-[7px]">
                      <Ionicons name="refresh" size={18} color={colors.ink} />
                      <Text className="text-ink text-[15px] font-bold">Retake</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Analyze photo with AI"
                    className="flex-[1.6] min-h-[54px] rounded-[15px] bg-leaf flex-row items-center justify-center gap-[8px] active:opacity-[0.72]"
                    onPress={analyzePhoto}
                  >
                    <Ionicons name="sparkles" size={19} color={colors.surface} />
                    <Text className="text-surface text-[16px] font-extrabold">Analyze</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : lowConfidence ? (
          <View>
            <Animated.View
              entering={FadeInUp.duration(420)}
              className="bg-surface border border-border rounded-md p-[16px] mt-[13px] shadow-card"
              style={{ elevation: 2 }}
            >
              <View className="flex-row items-center gap-[10px]">
                <Ionicons name="help-circle-outline" size={22} color={colors.amber} />
                <Text className="text-ink text-[17px] font-extrabold flex-1">Not confident enough</Text>
                <Text className="text-[12px] font-extrabold" style={{ color: confidenceColor(result.classification.confidence) }}>
                  {Math.round(result.classification.confidence * 100)}%
                </Text>
              </View>
              <Text className="text-muted text-[13px] leading-[19px] mt-[5px] mb-[13px]">
                The photo was unclear. Pick the category and condition yourself — we&apos;ll fetch a plain rate estimate.
              </Text>

              <Text className="text-leaf text-[11px] font-black tracking-[0.8px] mb-[8px]">CATEGORY</Text>
              <View className="flex-row flex-wrap gap-[7px] mb-[13px]">
                {CATEGORIES.map((item) => {
                  const selected = effectiveCategory === item;
                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="radio"
                      accessibilityLabel={categoryLabel(item)}
                      accessibilityState={{ checked: selected }}
                      className={`min-h-[42px] px-[12px] rounded-pill border items-center justify-center active:opacity-[0.72] ${selected ? 'bg-leaf-soft border-leaf' : 'bg-background border-border'}`}
                      onPress={() => setManualCategory(item)}
                    >
                      <Text className={`text-[12px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}>{categoryLabel(item)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="text-leaf text-[11px] font-black tracking-[0.8px] mb-[8px]">CONDITION</Text>
              <View className="flex-row flex-wrap gap-[7px]">
                {CONDITIONS.map((item) => {
                  const selected = effectiveCondition === item;
                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="radio"
                      accessibilityLabel={`Condition ${categoryLabel(item)}`}
                      accessibilityState={{ checked: selected }}
                      className={`min-h-[42px] px-[12px] rounded-pill border items-center justify-center active:opacity-[0.72] ${selected ? 'bg-leaf-soft border-leaf' : 'bg-background border-border'}`}
                      onPress={() => setManualCondition(item)}
                    >
                      <Text className={`text-[12px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}>{categoryLabel(item)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            <View className="mt-[13px]">
              <EstimatorCard
                estimate={manualEstimateQuery.data ?? null}
                isLoading={manualEstimateQuery.isLoading}
                notFound={manualEstimateQuery.isError}
                hasQuantity={normalizedManualQuantity > 0}
                quantityLabel={formatQuantityWithUnit(manualUnit, normalizedManualQuantity)}
                category={effectiveCategory}
                condition={effectiveCondition}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="List this scrap with the picked details"
              className="min-h-[54px] rounded-[15px] bg-leaf flex-row items-center justify-center gap-[8px] mt-[13px] active:opacity-[0.72]"
              onPress={listThisScrap}
            >
              <Ionicons name="add-circle-outline" size={19} color={colors.surface} />
              <Text className="text-surface text-[16px] font-extrabold">List this scrap</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scan another item"
              className="min-h-[48px] rounded-[15px] bg-background border border-border items-center justify-center mt-[9px] active:opacity-[0.72]"
              onPress={resetScan}
            >
              <Text className="text-ink text-[15px] font-bold">Scan another item</Text>
            </Pressable>
          </View>
        ) : (
          <VisionResultCard
            result={result}
            photoPreviewUri={photo?.previewUri ?? null}
            onListScrap={listThisScrap}
            onScanAgain={resetScan}
          />
        )}

        <View className="mt-[26px] mb-[10px]">
          <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">RECENT SCANS</Text>
          <Text className="text-muted text-[12px] mt-[2px]">Tap a scan to reopen its verdict.</Text>
        </View>

        <StateView
          isLoading={history.isLoading}
          loadingTitle="Loading scan history..."
          error={history.isError ? history.error : null}
          errorMessage={history.isError ? getErrorMessage(history.error, 'Could not load scan history.') : undefined}
          onRetry={() => void history.refetch()}
          isEmpty={!history.isLoading && !history.isError && (history.data?.length ?? 0) === 0}
          emptyIcon="sparkles-outline"
          emptyTitle="No scans yet"
          emptyMessage="Your AI valuations will appear here after your first scan."
          containerClassName="bg-surface border border-border rounded-md shadow-card"
        >
          <View className="bg-surface border border-border rounded-md shadow-card" style={{ elevation: 2 }} accessibilityLabel="Recent AI scans">
            {history.data?.map((scan, index) => {
              const visual = pathVisual(scan.next_life_path);
              const value = Number(scan.estimated_value_bdt);
              const valueLabel = Number.isInteger(value) ? String(value) : value.toFixed(2);
              return (
                <Pressable
                  key={scan.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Scan of ${categoryLabel(scan.detected_category)}, valued ${valueLabel} taka, ${timeAgo(scan.created_at)}`}
                  className={`flex-row items-center gap-[11px] px-[14px] min-h-[68px] active:opacity-[0.72] ${index > 0 ? 'border-t border-border' : ''}`}
                  onPress={() => setOpenScanId(scan.id)}
                >
                  <View className="w-[42px] h-[42px] rounded-[13px] bg-leaf-soft items-center justify-center" accessibilityElementsHidden>
                    <Ionicons name={CATEGORY_ICONS[scan.detected_category] ?? 'leaf-outline'} size={20} color={colors.leafDark} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-[6px]">
                      <Text className="text-ink text-[15px] font-extrabold" numberOfLines={1}>{categoryLabel(scan.detected_category)}</Text>
                      {scan.is_ewaste_hazard ? <Ionicons name="warning" size={13} color={colors.danger} /> : null}
                    </View>
                    <Text className="text-muted text-[12px] font-semibold mt-[1px]" numberOfLines={1}>
                      {formatQuantityWithUnit(scan.unit, scan.estimated_quantity)} · {visual.label} · {timeAgo(scan.created_at)}
                    </Text>
                  </View>
                  <Text className="text-leaf-dark text-[15px] font-extrabold">৳{valueLabel}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              );
            })}
          </View>
        </StateView>
      </ScrollView>

      <Modal
        visible={openScanId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenScanId(null)}
        accessibilityViewIsModal
      >
        <View className="flex-1 bg-overlay items-center justify-center p-[22px]">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close scan details"
            className="absolute top-0 right-0 bottom-0 left-0"
            onPress={() => setOpenScanId(null)}
          />
          <View className="w-full max-w-[430px] bg-surface border border-border rounded-md p-[16px] shadow-card" style={{ elevation: 4 }}>
            {scanDetail.isLoading || !scanDetail.data ? (
              <View className="min-h-[220px] items-center justify-center">
                <ActivityIndicator color={colors.leaf} size="large" />
                <Text className="text-muted text-[13px] font-bold mt-[10px]">Opening scan...</Text>
              </View>
            ) : scanDetail.isError ? (
              <View className="min-h-[160px] items-center justify-center">
                <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
                <Text className="text-ink text-[16px] font-extrabold mt-[9px]">Scan unavailable</Text>
                <Text className="text-muted text-[13px] text-center mt-[4px]">
                  {getErrorMessage(scanDetail.error, 'Could not load this scan.')}
                </Text>
              </View>
            ) : (
              <ScrollView>
                <View className="flex-row items-center justify-between mb-[13px]">
                  <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">SAVED VERDICT</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close scan details"
                    className="w-[44px] h-[44px] rounded-[14px] bg-surface-muted items-center justify-center active:opacity-[0.72]"
                    onPress={() => setOpenScanId(null)}
                  >
                    <Ionicons name="close" size={21} color={colors.ink} />
                  </Pressable>
                </View>

                <Text className="text-ink text-[24px] font-extrabold tracking-tight">
                  {categoryLabel(scanDetail.data.detected_category)}
                </Text>
                <Text className="text-muted text-[13px] font-semibold mt-[2px]">
                  {categoryLabel(scanDetail.data.detected_condition)} · {formatQuantityWithUnit(scanDetail.data.unit, scanDetail.data.estimated_quantity)}
                </Text>

                <Text className="text-ink text-[36px] leading-[44px] font-black tracking-tight mt-[9px]">
                  ৳{Number(scanDetail.data.estimated_value_bdt).toFixed(2).replace(/\.00$/, '')}
                </Text>

                <View className="flex-row items-center gap-[8px] mt-[9px]">
                  <Text className="text-muted text-[12px] font-bold">AI confidence</Text>
                  <Text className="text-[12px] font-extrabold" style={{ color: confidenceColor(Number(scanDetail.data.confidence)) }}>
                    {Math.round(Number(scanDetail.data.confidence) * 100)}%
                  </Text>
                  <Text className="text-muted text-[12px]">· {timeAgo(scanDetail.data.created_at)}</Text>
                </View>

                {scanDetail.data.is_ewaste_hazard ? (
                  <View accessibilityRole="alert" className="flex-row items-start gap-[9px] bg-danger-soft border border-danger rounded-md p-[12px] mt-[12px]">
                    <Ionicons name="warning" size={19} color={colors.danger} />
                    <Text className="text-danger text-[12px] leading-[18px] font-semibold flex-1">
                      E-waste hazard — routed to RECYCLE, cannot be overridden.
                    </Text>
                  </View>
                ) : null}

                <View className="border-l-[3px] border-leaf bg-leaf-soft rounded-r-[10px] px-[12px] py-[10px] mt-[12px]">
                  <Text className="text-leaf-dark text-[12px] leading-[18px] font-semibold italic">
                    &ldquo;{scanDetail.data.reasoning_rationale}&rdquo;
                  </Text>
                </View>

                {scanDetail.data.suggested_action ? (
                  <View className="flex-row items-start gap-[7px] mt-[10px]">
                    <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.leaf} />
                    <Text className="text-muted text-[12px] leading-[18px] font-medium flex-1">
                      {scanDetail.data.suggested_action}
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
