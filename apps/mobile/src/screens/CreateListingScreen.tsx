import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { CATEGORIES, CONDITIONS, categoryLabel, getCategoryUnit, type Category, type Condition } from '@/types';
import { PhotoUploader } from '@/components/PhotoUploader';
import { RateEstimateCard } from '@/components/RateEstimateCard';
import { useCreateListing } from '@/hooks/useCreateListing';
import { useEstimate } from '@/hooks/useEstimate';
import { pickAndCompressPhoto, type PreparedPhoto } from '@/lib/photo';

type CreateListingScreenProps = {
  onCreated: () => void;
};

export function CreateListingScreen({ onCreated }: CreateListingScreenProps) {
  const [category, setCategory] = useState<Category>('PLASTICS');
  const [condition, setCondition] = useState<Condition>('GOOD');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
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

  const unit = getCategoryUnit(category);
  const parsedQuantity = parseFloat(quantity);
  const hasValidQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  const parsedPrice = parseFloat(price);
  const hasValidPrice = Number.isFinite(parsedPrice) && parsedPrice > 0;
  const ratePerUnit = estimate ? Number(estimate.price_bdt) : 0;
  const totalEstimatedBdt = (hasValidQuantity && estimate && Number.isFinite(ratePerUnit))
    ? parsedQuantity * ratePerUnit
    : null;

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
      const nextPhoto = await pickAndCompressPhoto();
      if (!nextPhoto) return;
      setPhoto(nextPhoto);
      setNotice(`Photo ready: ${nextPhoto.width} x ${nextPhoto.height}, ${Math.ceil(nextPhoto.bytes / 1024)} KB.`);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Could not prepare this photo.'));
    } finally {
      setPreparingPhoto(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!photo) {
      setError('Add a real item photo before publishing.');
      return;
    }
    if (!hasValidQuantity) {
      setError(unit === 'kg' ? 'Enter a weight greater than 0 kg.' : 'Enter at least 1 piece.');
      return;
    }
    if (unit === 'piece' && !Number.isInteger(parsedQuantity)) {
      setError('Piece count must be a whole number.');
      return;
    }
    if (!hasValidPrice) {
      setError('Enter an asking price greater than 0.');
      return;
    }

    setError('');
    setNotice('');
    try {
      await createListing.mutateAsync({
        category,
        unit,
        ...(unit === 'kg'
          ? { declaredWeight: parsedQuantity }
          : { pieceCount: parsedQuantity }),
        declaredCondition: condition,
        price: parsedPrice,
        photos: [photo.dataUri],
      });
      setNotice('Listing published as active. It is now available in Browse.');
      timerRef.current = setTimeout(onCreated, 650);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Could not publish this listing.'));
    }
  }, [category, condition, createListing, hasValidPrice, hasValidQuantity, onCreated, parsedPrice, parsedQuantity, photo, unit]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-[20px] pb-[36px]"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">GIVE IT A NEXT LIFE</Text>
      <Text accessibilityRole="header" className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]">List an item</Text>
      <Text className="text-muted text-[14px] leading-[21px] mt-[7px] mb-[22px]">Choose only what you know. Final condition and value are confirmed by a partner later.</Text>

      <PhotoUploader
        photo={photo}
        preparingPhoto={preparingPhoto}
        onPickPhoto={() => void pickPhoto()}
        onRemovePhoto={() => {
          setPhoto(null);
          setNotice('');
        }}
      />

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

      <View className="bg-surface border border-border rounded-md p-[16px] mb-[13px] shadow-card" style={{ elevation: 2 }}>
        <View className="flex-row items-center gap-[9px] mb-[13px]">
          <Text className="text-leaf text-[11px] font-black tracking-[0.8px]">05</Text>
          <Text className="text-ink text-[17px] font-extrabold">Asking price</Text>
        </View>
        <View className="flex-row">
          <View className="min-w-[70px] min-h-[52px] border border-r-0 border-border rounded-tl-[12px] rounded-bl-[12px] bg-surface-muted items-center justify-center px-[12px]">
            <Text className="text-ink text-[16px] font-extrabold">৳</Text>
          </View>
          <TextInput
            accessibilityLabel="Asking price in Bangladeshi Taka"
            className="flex-1 min-h-[52px] border border-border rounded-tr-[12px] rounded-br-[12px] bg-background text-ink text-[17px] px-[14px]"
            placeholder="e.g. 50"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
          />
        </View>
        <Text className="text-muted text-[12px] leading-[18px] mt-[7px]">Set the price a buyer would pay to take this item home.</Text>
      </View>

      <RateEstimateCard
        estimate={estimate ?? null}
        isLoading={estimateLoading}
        parsedQuantity={parsedQuantity}
        totalEstimatedBdt={totalEstimatedBdt}
      />

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
