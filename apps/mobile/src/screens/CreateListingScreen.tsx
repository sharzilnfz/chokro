import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { CATEGORIES, CONDITIONS, categoryLabel, type Category, type Condition } from '@/types';
import { useCreateListing } from '@/hooks/useCreateListing';
import { useEstimate } from '@/hooks/useEstimate';

const PIECE_CATEGORIES: ReadonlyArray<Category> = ['APPLIANCES', 'E_WASTE'];
const MAX_UPLOAD_BYTES = 500 * 1024;

type PreparedPhoto = {
  previewUri: string;
  dataUri: string;
  width: number;
  height: number;
  bytes: number;
};

type CreateListingScreenProps = {
  onCreated: () => void;
};

function estimatedBase64Bytes(value: string): number {
  return Math.ceil((value.length * 3) / 4);
}

async function preparePhoto(asset: ImagePicker.ImagePickerAsset): Promise<PreparedPhoto> {
  let sourceUri = asset.uri;
  let sourceWidth = asset.width;
  let sourceHeight = asset.height;
  if (!sourceWidth || !sourceHeight) {
    const inspected = await manipulateAsync(asset.uri, [], { compress: 1, format: SaveFormat.JPEG });
    sourceUri = inspected.uri;
    sourceWidth = inspected.width;
    sourceHeight = inspected.height;
  }

  const largestSide = Math.max(sourceWidth, sourceHeight);
  const configurations = [
    { maxDimension: Math.min(largestSide || 1600, 1600), compress: 0.72 },
    { maxDimension: Math.min(largestSide || 1600, 1600), compress: 0.52 },
    { maxDimension: Math.min(largestSide || 1400, 1400), compress: 0.46 },
    { maxDimension: Math.min(largestSide || 1200, 1200), compress: 0.4 },
    { maxDimension: Math.min(largestSide || 1000, 1000), compress: 0.36 },
  ];

  let prepared: PreparedPhoto | null = null;
  for (const configuration of configurations) {
    const resize = sourceWidth >= sourceHeight
      ? { width: configuration.maxDimension }
      : { height: configuration.maxDimension };
    const result = await manipulateAsync(
      sourceUri,
      largestSide > configuration.maxDimension ? [{ resize }] : [],
      { base64: true, compress: configuration.compress, format: SaveFormat.JPEG },
    );
    if (!result.base64) throw new Error('The selected photo could not be prepared.');

    prepared = {
      previewUri: result.uri,
      dataUri: `data:image/jpeg;base64,${result.base64}`,
      width: result.width,
      height: result.height,
      bytes: estimatedBase64Bytes(result.base64),
    };
    if (prepared.bytes <= MAX_UPLOAD_BYTES) return prepared;
  }

  if (!prepared) throw new Error('The selected photo could not be prepared.');
  throw new Error('This photo is still larger than 500 KB after compression. Choose a simpler photo.');
}

export function CreateListingScreen({ onCreated }: CreateListingScreenProps) {
  const [category, setCategory] = useState<Category>('PLASTICS');
  const [condition, setCondition] = useState<Condition>('GOOD');
  const [quantity, setQuantity] = useState('');
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const createListing = useCreateListing();
  const { data: estimate, isLoading: estimateLoading } = useEstimate(category, condition);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const unit = PIECE_CATEGORIES.includes(category) ? 'piece' : 'kg';

  const selectCategory = useCallback((nextCategory: Category) => {
    setCategory(nextCategory);
    setQuantity('');
    setError('');
  }, []);

  const pickPhoto = useCallback(async () => {
    setPreparingPhoto(true);
    setError('');
    setNotice('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Photo access is needed to attach an item photo. You can enable it in device settings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 1,
      });
      if (result.canceled) return;

      const nextPhoto = await preparePhoto(result.assets[0]);
      setPhoto(nextPhoto);
      setNotice(`Photo ready: ${nextPhoto.width} x ${nextPhoto.height}, ${Math.ceil(nextPhoto.bytes / 1024)} KB.`);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Could not prepare this photo.'));
    } finally {
      setPreparingPhoto(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const numericQuantity = Number(quantity);
    if (!photo) {
      setError('Add a real item photo before publishing.');
      return;
    }
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      setError(unit === 'kg' ? 'Enter a weight greater than 0 kg.' : 'Enter at least 1 piece.');
      return;
    }
    if (unit === 'piece' && !Number.isInteger(numericQuantity)) {
      setError('Piece count must be a whole number.');
      return;
    }

    setError('');
    setNotice('');
    try {
      await createListing.mutateAsync({
        category,
        unit,
        ...(unit === 'kg'
          ? { declaredWeight: numericQuantity }
          : { pieceCount: numericQuantity }),
        declaredCondition: condition,
        photos: [photo.dataUri],
      });
      setNotice('Listing published as active. It is now available in Browse.');
      timerRef.current = setTimeout(onCreated, 650);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Could not publish this listing.'));
    }
  }, [category, condition, createListing, onCreated, photo, quantity, unit]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-[20px] pb-[36px]"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">GIVE IT A NEXT LIFE</Text>
      <Text accessibilityRole="header" className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]">List an item</Text>
      <Text className="text-muted text-[14px] leading-[21px] mt-[7px] mb-[22px]">Choose only what you know. Final condition and value are confirmed by a partner later.</Text>

      <View className="bg-surface border border-border rounded-md p-[16px] mb-[13px] shadow-card" style={{ elevation: 2 }}>
        <View className="flex-row items-center gap-[9px] mb-[13px]">
          <Text className="text-leaf text-[11px] font-black tracking-[0.8px]">01</Text>
          <Text className="text-ink text-[17px] font-extrabold">Item photo</Text>
        </View>

        {photo ? (
          <View className="h-[220px] rounded-[14px] overflow-hidden bg-surface-muted">
            <Image source={{ uri: photo.previewUri }} className="w-full h-full" style={{ resizeMode: 'cover' }} accessibilityLabel="Selected item photo" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove selected photo"
              className="absolute top-[8px] right-[8px] w-[48px] h-[48px] rounded-[24px] bg-overlay items-center justify-center active:opacity-[0.72]"
              onPress={() => {
                setPhoto(null);
                setNotice('');
              }}
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
            onPress={() => void pickPhoto()}
          >
            {preparingPhoto ? (
              <ActivityIndicator color={colors.leaf} />
            ) : (
              <Ionicons name="image-outline" size={29} color={colors.leaf} />
            )}
            <Text className="text-leaf-dark text-[16px] font-extrabold mt-[7px]">{preparingPhoto ? 'Preparing photo...' : 'Choose from photos'}</Text>
            <Text className="text-muted text-[12px] leading-[18px] text-center mt-[4px]">Downscaled to 1600 px or less and compressed below 500 KB.</Text>
          </Pressable>
        )}
      </View>

      <View className="bg-surface border border-border rounded-md p-[16px] mb-[13px] shadow-card" style={{ elevation: 2 }}>
        <View className="flex-row items-center gap-[9px] mb-[13px]">
          <Text className="text-leaf text-[11px] font-black tracking-[0.8px]">02</Text>
          <Text className="text-ink text-[17px] font-extrabold">Category</Text>
        </View>
        <View className="flex-row flex-wrap gap-[8px]">
          {CATEGORIES.map((item) => {
            const selected = category === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityLabel={categoryLabel(item)}
                accessibilityState={{ checked: selected }}
                className={`min-h-[48px] px-[13px] rounded-pill border items-center justify-center active:opacity-[0.72] ${selected ? 'bg-leaf-soft border-leaf' : 'bg-background border-border'}`}
                onPress={() => selectCategory(item)}
              >
                <Text className={`text-[13px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}>{categoryLabel(item)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="bg-surface border border-border rounded-md p-[16px] mb-[13px] shadow-card" style={{ elevation: 2 }}>
        <View className="flex-row items-center gap-[9px] mb-[13px]">
          <Text className="text-leaf text-[11px] font-black tracking-[0.8px]">03</Text>
          <Text className="text-ink text-[17px] font-extrabold">{unit === 'kg' ? 'Weight' : 'Quantity'}</Text>
        </View>
        <View className="flex-row">
          <TextInput
            accessibilityLabel={unit === 'kg' ? 'Estimated weight in kilograms' : 'Number of pieces'}
            className="flex-1 min-h-[52px] border border-r-0 border-border rounded-tl-[12px] rounded-bl-[12px] bg-background text-ink text-[17px] px-[14px]"
            placeholder={unit === 'kg' ? 'e.g. 2.5' : 'e.g. 1'}
            placeholderTextColor={colors.muted}
            keyboardType={unit === 'kg' ? 'decimal-pad' : 'number-pad'}
            value={quantity}
            onChangeText={setQuantity}
          />
          <View className="min-w-[88px] min-h-[52px] border border-border rounded-tr-[12px] rounded-br-[12px] bg-surface-muted items-center justify-center px-[12px]">
            <Text className="text-ink text-[14px] font-extrabold">{unit === 'kg' ? 'kg' : 'pieces'}</Text>
          </View>
        </View>
        <Text className="text-muted text-[12px] leading-[18px] mt-[7px]">{unit === 'kg' ? 'Materials are listed by estimated kilograms.' : 'Appliances and e-waste are listed by whole pieces.'}</Text>
      </View>

      <View className="bg-surface border border-border rounded-md p-[16px] mb-[13px] shadow-card" style={{ elevation: 2 }}>
        <View className="flex-row items-center gap-[9px] mb-[13px]">
          <Text className="text-leaf text-[11px] font-black tracking-[0.8px]">04</Text>
          <Text className="text-ink text-[17px] font-extrabold">Declared condition</Text>
        </View>
        <View className="flex-row flex-wrap gap-[8px]">
          {CONDITIONS.map((item) => {
            const selected = condition === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityLabel={`Condition ${categoryLabel(item)}`}
                accessibilityState={{ checked: selected }}
                className={`min-h-[48px] px-[13px] rounded-pill border items-center justify-center active:opacity-[0.72] ${selected ? 'bg-leaf-soft border-leaf' : 'bg-background border-border'}`}
                onPress={() => setCondition(item)}
              >
                <Text className={`text-[13px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}>{categoryLabel(item)}</Text>
              </Pressable>
            );
          })}
        </View>
        <View className="min-h-[48px] flex-row items-center gap-[8px] border-t border-border mt-[14px] pt-[12px]">
          <Ionicons name="radio-button-on" size={17} color={colors.leaf} />
          <Text className="text-muted text-[13px] font-bold">Publishing status: Active</Text>
        </View>
      </View>

      {/* Rate Card Value Estimate */}
      {estimateLoading ? (
        <View className="bg-leaf-soft border border-leaf rounded-md p-[16px] mb-[13px] shadow-card items-center" style={{ elevation: 2 }}>
          <ActivityIndicator size="small" color={colors.leaf} />
          <Text className="text-leaf-dark text-[13px] font-bold mt-[6px]">Looking up current rate...</Text>
        </View>
      ) : estimate ? (
        <View className="bg-leaf-soft border border-leaf rounded-md p-[16px] mb-[13px] shadow-card" style={{ elevation: 2 }}>
          <View className="flex-row items-center gap-[9px] mb-[6px]">
            <Ionicons name="pricetag" size={18} color={colors.leaf} />
            <Text className="text-leaf-dark text-[17px] font-extrabold">Estimated value</Text>
          </View>
          <Text className="text-ink text-[28px] font-black tracking-tight">
            ৳{Number(estimate.price_bdt).toFixed(2)}
            <Text className="text-muted text-[16px] font-bold">/{estimate.unit}</Text>
          </Text>
          <Text className="text-muted text-[12px] leading-[18px] mt-[6px]">Final value confirmed at pickup by a verified partner.</Text>
        </View>
      ) : null}

      {error ? <Text accessibilityRole="alert" className="text-danger bg-danger-soft p-[13px] rounded-[12px] text-[14px] leading-[20px] font-semibold mb-[12px]">{error}</Text> : null}
      {notice ? <Text accessibilityRole="alert" className="text-leaf-dark bg-leaf-soft p-[13px] rounded-[12px] text-[14px] leading-[20px] font-semibold mb-[12px]">{notice}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Publish active listing"
        accessibilityState={{ disabled: createListing.isPending || preparingPhoto, busy: createListing.isPending }}
        className={`min-h-[54px] rounded-[15px] bg-leaf items-center justify-center mt-[3px] active:opacity-[0.72] ${(createListing.isPending || preparingPhoto) ? 'opacity-[0.55]' : ''}`}
        disabled={createListing.isPending || preparingPhoto}
        onPress={() => void handleSubmit()}
      >
        {createListing.isPending ? <ActivityIndicator color={colors.surface} /> : <Text className="text-surface text-[16px] font-extrabold">Publish listing</Text>}
      </Pressable>
    </ScrollView>
  );
}
