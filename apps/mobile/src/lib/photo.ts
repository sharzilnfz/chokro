import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export type PreparedPhoto = {
  previewUri: string;
  dataUri: string;
  width: number;
  height: number;
  bytes: number;
};

export const MAX_UPLOAD_BYTES = 500 * 1024;

export function estimatedBase64Bytes(value: string): number {
  return Math.ceil((value.length * 3) / 4);
}

export async function compressPhoto(asset: ImagePicker.ImagePickerAsset): Promise<PreparedPhoto> {
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

export async function pickAndCompressPhoto(): Promise<PreparedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo access is needed to attach an item photo. You can enable it in device settings.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection: false,
    quality: 1,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return compressPhoto(result.assets[0]);
}
