// Photo picking and compression helpers that prepare images for upload.
// Expo picker and image manipulator for selection and resizing.
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// A ready-to-upload image: preview URI, base64 data URI, dimensions, and size.
export type PreparedPhoto = {
  previewUri: string;
  dataUri: string;
  width: number;
  height: number;
  bytes: number;
};

// Hard cap on upload size in bytes.
export const MAX_UPLOAD_BYTES = 500 * 1024;

// Approximate decoded byte size from a base64 string length.
export function estimatedBase64Bytes(value: string): number {
  return Math.ceil((value.length * 3) / 4);
}

// Downscale and re-encode an asset until it fits within the upload cap.
export async function compressPhoto(asset: ImagePicker.ImagePickerAsset): Promise<PreparedPhoto> {
  let sourceUri = asset.uri;
  let sourceWidth = asset.width;
  let sourceHeight = asset.height;
  // Read missing dimensions from the source image before scaling.
  if (!sourceWidth || !sourceHeight) {
    const inspected = await manipulateAsync(asset.uri, [], { compress: 1, format: SaveFormat.JPEG });
    sourceUri = inspected.uri;
    sourceWidth = inspected.width;
    sourceHeight = inspected.height;
  }

  // Candidate resize/quality settings tried in decreasing fidelity.
  const largestSide = Math.max(sourceWidth, sourceHeight);
  const configurations = [
    { maxDimension: Math.min(largestSide || 1600, 1600), compress: 0.72 },
    { maxDimension: Math.min(largestSide || 1600, 1600), compress: 0.52 },
    { maxDimension: Math.min(largestSide || 1400, 1400), compress: 0.46 },
    { maxDimension: Math.min(largestSide || 1200, 1200), compress: 0.4 },
    { maxDimension: Math.min(largestSide || 1000, 1000), compress: 0.36 },
  ];

  // Walk the settings in order, returning the first result under the cap.
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

  // All attempts exceeded the cap: guide the user toward a simpler photo.
  if (!prepared) throw new Error('The selected photo could not be prepared.');
  throw new Error('This photo is still larger than 500 KB after compression. Choose a simpler photo.');
}

// Request permission, let the user pick an image, then compress it.
export async function pickAndCompressPhoto(): Promise<PreparedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo access is needed to attach an item photo. You can enable it in device settings.');
  }

  // Launch the system library for a single image.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection: false,
    quality: 1,
  });

  // Treat a dismissed picker as "no photo chosen" rather than an error.
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return compressPhoto(result.assets[0]);
}
