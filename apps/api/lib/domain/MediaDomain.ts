import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import ExifParser from 'exif-parser';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { BadRequestError } from '../database';
import { listingMediaRepo } from '../repos/listingMedia';
import { isPieceCategory } from '@chokro/shared';

// Maximum file size: 5MB
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Allowed MIME types
export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export interface ProcessMediaInput {
  buffer: Buffer;
  originalFilename?: string;
  mimeType: string;
  uploaderId: string;
  listingId?: string | null;
  category?: string | null;
  purpose?: 'LISTING' | 'DEPOSIT_EVIDENCE' | 'DISPUTE_PROOF';
}

// Transport-level upload payload parsed out of an HTTP request: multipart
// form-data, JSON with a data-URI/base64 image, or a raw binary body.
export interface ParsedUpload {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  purpose?: 'LISTING' | 'DEPOSIT_EVIDENCE' | 'DISPUTE_PROOF';
  listingId?: string;
  category?: string;
}

export interface ProcessMediaResult {
  mediaId: string;
  publicUrl: string;
  thumbnailUrl: string;
  isPrivacyStripped: boolean;
  byteSize: number;
  degradedMode: boolean;
  width?: number | null;
  height?: number | null;
  exifGpsExtracted: boolean;
  extractedLat?: number | null;
  extractedLng?: number | null;
}

export interface ExifExtractionResult {
  extracted: boolean;
  lat: number | null;
  lng: number | null;
  dateTimeOriginal?: string | null;
  make?: string | null;
  model?: string | null;
}

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads/media');

function ensureUploadDir(): string {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  return UPLOAD_DIR;
}

function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );
}

export class MediaDomain {
  /**
   * Parses an upload Request into a ParsedUpload, accepting multipart/form-data,
   * JSON (file/dataUri/base64 data-URI or raw base64), or a raw binary body.
   * Throws BadRequestError for missing or empty payloads.
   */
  static async parseUploadRequest(req: Request): Promise<ParsedUpload> {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        throw new BadRequestError('No file provided in form data');
      }
      const arrayBuffer = await file.arrayBuffer();
      return {
        buffer: Buffer.from(arrayBuffer),
        originalFilename: file.name || 'image.jpg',
        mimeType: file.type || 'image/jpeg',
        purpose: (formData.get('purpose') as any) || undefined,
        listingId: (formData.get('listingId') as string) || (formData.get('listing_id') as string) || undefined,
        category: (formData.get('category') as string) || undefined,
      };
    }

    if (contentType.includes('application/json')) {
      const json = await req.json();
      if (!json.file && !json.dataUri && !json.base64) {
        throw new BadRequestError('No image payload provided');
      }
      const raw = json.file || json.dataUri || json.base64;
      let mimeType = 'image/jpeg';
      let buffer: Buffer;
      if (typeof raw === 'string' && raw.startsWith('data:')) {
        const parts = raw.split(',');
        const match = parts[0].match(/:(.*?);/);
        mimeType = match ? match[1] : 'image/jpeg';
        buffer = Buffer.from(parts[1], 'base64');
      } else {
        buffer = Buffer.from(raw, 'base64');
      }
      return {
        buffer,
        originalFilename: json.filename || 'image.jpg',
        mimeType,
        purpose: json.purpose,
        listingId: json.listingId || json.listing_id,
        category: json.category,
      };
    }

    // Raw binary stream
    const arrayBuffer = await req.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new BadRequestError('Empty media payload');
    }
    return {
      buffer: Buffer.from(arrayBuffer),
      originalFilename: 'image.jpg',
      mimeType: contentType || 'image/jpeg',
    };
  }

  /**
   * Returns max allowable photos for a material category.
   * Recyclable materials: 3, Appliances / E-Waste: 5.
   */
  static getMaxQuota(category?: string | null): number {
    if (!category) return 3;
    return isPieceCategory(category) ? 5 : 3;
  }

  /**
   * Enforces media limit for a listing.
   */
  static async validateListingQuota(listingId: string, category?: string | null): Promise<void> {
    const max = MediaDomain.getMaxQuota(category);
    const count = await listingMediaRepo.countByListingId(listingId);
    if (count >= max) {
      throw new BadRequestError(`Maximum ${max} photos allowed for ${category || 'listing'}`);
    }
  }

  /**
   * Extracts GPS coordinates and camera metadata from image EXIF if present.
   */
  static extractExif(buffer: Buffer): ExifExtractionResult {
    try {
      const parser = ExifParser.create(buffer);
      const result = parser.parse();
      if (
        result &&
        result.tags &&
        typeof result.tags.GPSLatitude === 'number' &&
        typeof result.tags.GPSLongitude === 'number' &&
        !isNaN(result.tags.GPSLatitude) &&
        !isNaN(result.tags.GPSLongitude)
      ) {
        return {
          extracted: true,
          lat: result.tags.GPSLatitude,
          lng: result.tags.GPSLongitude,
          dateTimeOriginal: result.tags.DateTimeOriginal ? String(result.tags.DateTimeOriginal) : null,
          make: result.tags.Make ? String(result.tags.Make) : null,
          model: result.tags.Model ? String(result.tags.Model) : null,
        };
      }
    } catch {
      // Non-JPEG or missing EXIF header
    }
    return {
      extracted: false,
      lat: null,
      lng: null,
    };
  }

  /**
   * Processes input buffer, strips 100% EXIF/IPTC/XMP binary metadata,
   * generates 3 responsive WebP derivatives (thumb 150x150, card 600x600, full 1200x1200),
   * uploads to Cloudinary or local fallback, and creates a listing_media record.
   */
  static async processAndStore(input: ProcessMediaInput): Promise<ProcessMediaResult> {
    // 1. MIME and Size Validation
    const normalizedMime = (input.mimeType || '').toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
      throw new BadRequestError('Unsupported media type. Allowed formats: JPEG, PNG, WebP');
    }

    if (input.buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestError('File size exceeds 5MB limit');
    }

    // 2. Listing Quota validation if listingId is provided
    if (input.listingId) {
      await MediaDomain.validateListingQuota(input.listingId, input.category);
    }

    // 3. Capture-time GPS Interception
    const exifData = MediaDomain.extractExif(input.buffer);

    // 4. Transform image and strip 100% EXIF / IPTC / XMP metadata via Sharp
    const image = sharp(input.buffer);
    const metadata = await image.metadata();

    const [thumbBuffer, cardBuffer, fullBuffer] = await Promise.all([
      sharp(input.buffer).rotate().resize(150, 150, { fit: 'cover' }).webp({ quality: 80 }).toBuffer(),
      sharp(input.buffer).rotate().resize(600, 600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
      sharp(input.buffer).rotate().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer(),
    ]);

    const hash = crypto.createHash('sha256').update(fullBuffer).digest('hex').slice(0, 16);
    const baseFilename = `${Date.now()}-${hash}`;
    const origFilename = input.originalFilename || `upload-${hash}.webp`;

    let storageProvider = 'CLOUDINARY';
    let publicUrl = '';
    let thumbnailUrl = '';
    let degradedMode = false;

    // 5. Cloud Storage or Local Fallback
    if (isCloudinaryConfigured()) {
      try {
        const [fullRes, thumbRes] = await Promise.all([
          new Promise<UploadApiResponse>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'chokro/media',
                public_id: `${baseFilename}-full`,
                resource_type: 'image',
                format: 'webp',
              },
              (err, res) => (err || !res ? reject(err) : resolve(res))
            );
            uploadStream.end(fullBuffer);
          }),
          new Promise<UploadApiResponse>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'chokro/media',
                public_id: `${baseFilename}-thumb`,
                resource_type: 'image',
                format: 'webp',
              },
              (err, res) => (err || !res ? reject(err) : resolve(res))
            );
            uploadStream.end(thumbBuffer);
          }),
        ]);

        publicUrl = fullRes.secure_url;
        thumbnailUrl = thumbRes.secure_url;
        storageProvider = 'CLOUDINARY';
        degradedMode = false;
      } catch (cloudErr) {
        console.warn('[MEDIA_DEGRADED_MODE] Cloudinary upload failed, storing media locally in public uploads directory', cloudErr);
        degradedMode = true;
      }
    } else {
      degradedMode = true;
    }

    if (degradedMode) {
      console.warn('[MEDIA_DEGRADED_MODE] Storing media locally in public uploads directory');
      const dir = ensureUploadDir();
      const fullPath = path.join(dir, `${baseFilename}-full.webp`);
      const cardPath = path.join(dir, `${baseFilename}-card.webp`);
      const thumbPath = path.join(dir, `${baseFilename}-thumb.webp`);

      fs.writeFileSync(fullPath, fullBuffer);
      fs.writeFileSync(cardPath, cardBuffer);
      fs.writeFileSync(thumbPath, thumbBuffer);

      publicUrl = `/uploads/media/${baseFilename}-full.webp`;
      thumbnailUrl = `/uploads/media/${baseFilename}-thumb.webp`;
      storageProvider = 'LOCAL_FS';
    }

    // 6. Persist to DB
    const mediaRecord = await listingMediaRepo.create({
      listing_id: input.listingId || null,
      uploader_id: input.uploaderId,
      storage_provider: storageProvider,
      public_url: publicUrl,
      thumbnail_url: thumbnailUrl,
      original_filename: origFilename,
      mime_type: 'image/webp',
      byte_size: fullBuffer.length,
      width: metadata.width || null,
      height: metadata.height || null,
      exif_gps_extracted: exifData.extracted,
      extracted_lat: exifData.lat,
      extracted_lng: exifData.lng,
      is_privacy_stripped: true,
    });

    return {
      mediaId: mediaRecord.id,
      publicUrl: mediaRecord.public_url,
      thumbnailUrl: mediaRecord.thumbnail_url,
      isPrivacyStripped: mediaRecord.is_privacy_stripped,
      byteSize: mediaRecord.byte_size,
      degradedMode,
      width: mediaRecord.width,
      height: mediaRecord.height,
      exifGpsExtracted: mediaRecord.exif_gps_extracted,
      extractedLat: mediaRecord.extracted_lat,
      extractedLng: mediaRecord.extracted_lng,
    };
  }

  /**
   * Permanently deletes a media asset by ID if the caller is the uploader or an admin.
   */
  static async deleteMedia(mediaId: string, userId: string, userRole: string): Promise<{ success: boolean; message: string }> {
    const record = await listingMediaRepo.findById(mediaId);
    if (!record) {
      throw new BadRequestError('Media asset not found');
    }

    if (record.uploader_id !== userId && userRole !== 'ADMIN') {
      throw new BadRequestError('Unauthorized to delete this media asset');
    }

    // Clean up filesystem if local
    if (record.storage_provider === 'LOCAL_FS' && record.public_url.startsWith('/uploads/media/')) {
      const filename = path.basename(record.public_url);
      const base = filename.replace('-full.webp', '');
      const dir = ensureUploadDir();
      const files = [
        path.join(dir, `${base}-full.webp`),
        path.join(dir, `${base}-card.webp`),
        path.join(dir, `${base}-thumb.webp`),
      ];
      for (const file of files) {
        if (fs.existsSync(file)) {
          try {
            fs.unlinkSync(file);
          } catch {
            // Ignore unlink errors
          }
        }
      }
    } else if (record.storage_provider === 'CLOUDINARY' && isCloudinaryConfigured()) {
      try {
        const urlParts = record.public_url.split('/');
        const publicIdWithExt = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExt ? `chokro/media/${publicIdWithExt.split('.')[0]}` : null;
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      } catch {
        // Ignore remote deletion errors
      }
    }

    await listingMediaRepo.deleteById(mediaId);
    return { success: true, message: 'Media asset deleted' };
  }
}
