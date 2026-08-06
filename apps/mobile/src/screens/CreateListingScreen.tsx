import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { apiRequest, getErrorMessage } from '../api';
import { colors, radii, shadows } from '../theme';
import { CATEGORIES, CONDITIONS, categoryLabel, type Category, type Condition } from '../types';

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
  token: string;
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

export function CreateListingScreen({ token, onCreated }: CreateListingScreenProps) {
  const [category, setCategory] = useState<Category>('PLASTICS');
  const [condition, setCondition] = useState<Condition>('GOOD');
  const [quantity, setQuantity] = useState('');
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const unit = PIECE_CATEGORIES.includes(category) ? 'piece' : 'kg';

  const selectCategory = (nextCategory: Category) => {
    setCategory(nextCategory);
    setQuantity('');
    setError('');
  };

  const pickPhoto = async () => {
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
  };

  const handleSubmit = async () => {
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

    setLoading(true);
    setError('');
    setNotice('');
    try {
      await apiRequest('/api/listings', {
        method: 'POST',
        token,
        body: JSON.stringify({
          category,
          unit,
          ...(unit === 'kg'
            ? { declaredWeight: numericQuantity }
            : { pieceCount: numericQuantity }),
          declaredCondition: condition,
          photos: [photo.dataUri],
        }),
      });
      setNotice('Listing published as active. It is now available in Browse.');
      setTimeout(onCreated, 650);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Could not publish this listing.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>GIVE IT A NEXT LIFE</Text>
      <Text accessibilityRole="header" style={styles.title}>List an item</Text>
      <Text style={styles.subtitle}>Choose only what you know. Final condition and value are confirmed by a partner later.</Text>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionNumber}>01</Text>
          <Text style={styles.sectionTitle}>Item photo</Text>
        </View>

        {photo ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photo.previewUri }} style={styles.photo} accessibilityLabel="Selected item photo" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove selected photo"
              style={({ pressed }) => [styles.removePhoto, pressed && styles.pressed]}
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
            style={({ pressed }) => [styles.photoPicker, pressed && styles.pressed]}
            disabled={preparingPhoto}
            onPress={() => void pickPhoto()}
          >
            {preparingPhoto ? (
              <ActivityIndicator color={colors.leaf} />
            ) : (
              <Ionicons name="image-outline" size={29} color={colors.leaf} />
            )}
            <Text style={styles.photoPickerTitle}>{preparingPhoto ? 'Preparing photo...' : 'Choose from photos'}</Text>
            <Text style={styles.photoPickerCopy}>Downscaled to 1600 px or less and compressed below 500 KB.</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionNumber}>02</Text>
          <Text style={styles.sectionTitle}>Category</Text>
        </View>
        <View style={styles.options}>
          {CATEGORIES.map((item) => {
            const selected = category === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityLabel={categoryLabel(item)}
                accessibilityState={{ checked: selected }}
                style={({ pressed }) => [styles.chip, selected && styles.chipActive, pressed && styles.pressed]}
                onPress={() => selectCategory(item)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{categoryLabel(item)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionNumber}>03</Text>
          <Text style={styles.sectionTitle}>{unit === 'kg' ? 'Weight' : 'Quantity'}</Text>
        </View>
        <View style={styles.quantityRow}>
          <TextInput
            accessibilityLabel={unit === 'kg' ? 'Estimated weight in kilograms' : 'Number of pieces'}
            style={styles.quantityInput}
            placeholder={unit === 'kg' ? 'e.g. 2.5' : 'e.g. 1'}
            placeholderTextColor={colors.muted}
            keyboardType={unit === 'kg' ? 'decimal-pad' : 'number-pad'}
            value={quantity}
            onChangeText={setQuantity}
          />
          <View style={styles.unitBox}>
            <Text style={styles.unitText}>{unit === 'kg' ? 'kg' : 'pieces'}</Text>
          </View>
        </View>
        <Text style={styles.helper}>{unit === 'kg' ? 'Materials are listed by estimated kilograms.' : 'Appliances and e-waste are listed by whole pieces.'}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionNumber}>04</Text>
          <Text style={styles.sectionTitle}>Declared condition</Text>
        </View>
        <View style={styles.options}>
          {CONDITIONS.map((item) => {
            const selected = condition === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityLabel={`Condition ${categoryLabel(item)}`}
                accessibilityState={{ checked: selected }}
                style={({ pressed }) => [styles.chip, selected && styles.chipActive, pressed && styles.pressed]}
                onPress={() => setCondition(item)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{categoryLabel(item)}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.statusRow}>
          <Ionicons name="radio-button-on" size={17} color={colors.leaf} />
          <Text style={styles.statusText}>Publishing status: Active</Text>
        </View>
      </View>

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Publish active listing"
        accessibilityState={{ disabled: loading || preparingPhoto, busy: loading }}
        style={({ pressed }) => [styles.publishButton, pressed && styles.pressed, (loading || preparingPhoto) && styles.disabled]}
        disabled={loading || preparingPhoto}
        onPress={() => void handleSubmit()}
      >
        {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.publishText}>Publish listing</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36 },
  eyebrow: { color: colors.leaf, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 31, lineHeight: 37, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 22 },
  section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, padding: 16, marginBottom: 13, ...shadows.card },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13 },
  sectionNumber: { color: colors.leaf, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  photoPicker: { minHeight: 150, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.leaf, borderRadius: 14, backgroundColor: colors.leafSoft, alignItems: 'center', justifyContent: 'center', padding: 18 },
  photoPickerTitle: { color: colors.leafDark, fontSize: 16, fontWeight: '800', marginTop: 7 },
  photoPickerCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  photoWrap: { height: 220, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  removePhoto: { position: 'absolute', top: 8, right: 8, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 48, paddingHorizontal: 13, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.leafSoft, borderColor: colors.leaf },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: colors.leafDark },
  quantityRow: { flexDirection: 'row' },
  quantityInput: { flex: 1, minHeight: 52, borderWidth: 1, borderRightWidth: 0, borderColor: colors.border, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, backgroundColor: colors.background, color: colors.ink, fontSize: 17, paddingHorizontal: 14 },
  unitBox: { minWidth: 88, minHeight: 52, borderWidth: 1, borderColor: colors.border, borderTopRightRadius: 12, borderBottomRightRadius: 12, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  unitText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  statusRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 14, paddingTop: 12 },
  statusText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  error: { color: colors.danger, backgroundColor: colors.dangerSoft, padding: 13, borderRadius: 12, fontSize: 14, lineHeight: 20, fontWeight: '600', marginBottom: 12 },
  notice: { color: colors.leafDark, backgroundColor: colors.leafSoft, padding: 13, borderRadius: 12, fontSize: 14, lineHeight: 20, fontWeight: '600', marginBottom: 12 },
  publishButton: { minHeight: 54, borderRadius: 15, backgroundColor: colors.leaf, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  publishText: { color: colors.surface, fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.74 },
});
