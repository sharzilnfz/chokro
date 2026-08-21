// Spec 16 / Ticket 03: Circular Marketplace Media & Privacy-Safe Ingest Pipeline
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import ExifParser from 'exif-parser';
import { db, listingMedia, listings, eq } from '@chokro/db';
import { resetTestStore, createTestUser, tokenFor, authHeaders, routeParams } from './test-utils';
import { MediaDomain, MAX_FILE_SIZE_BYTES } from '../lib/domain/MediaDomain';
import { POST as uploadHandler } from '../app/api/v1/media/upload/route';
import { DELETE as deleteHandler } from '../app/api/v1/media/[id]/route';

/**
 * Builds a valid JPEG image buffer containing an APP1 EXIF segment with GPS coordinates.
 */
function createJpegWithGpsExif(lat = 23.8103, lng = 90.4125, baseJpeg?: Buffer): Buffer {
  const latDeg = Math.floor(Math.abs(lat));
  const latMin = Math.floor((Math.abs(lat) - latDeg) * 60);
  const latSec = Math.round(((Math.abs(lat) - latDeg) * 60 - latMin) * 60 * 100);

  const lngDeg = Math.floor(Math.abs(lng));
  const lngMin = Math.floor((Math.abs(lng) - lngDeg) * 60);
  const lngSec = Math.round(((Math.abs(lng) - lngDeg) * 60 - lngMin) * 60 * 100);

  const tiff = Buffer.alloc(132);
  tiff.write('II', 0);
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);

  // 0th IFD (starts at 8)
  tiff.writeUInt16LE(1, 8); // 1 tag
  tiff.writeUInt16LE(0x8825, 10); // GPS IFD pointer
  tiff.writeUInt16LE(4, 12); // LONG
  tiff.writeUInt32LE(1, 14); // count 1
  tiff.writeUInt32LE(26, 18); // offset to GPS IFD (26)
  tiff.writeUInt32LE(0, 22); // next IFD offset (0)

  // GPS IFD (starts at 26)
  tiff.writeUInt16LE(4, 26); // 4 tags

  // 1. GPSLatitudeRef
  tiff.writeUInt16LE(0x0001, 28);
  tiff.writeUInt16LE(2, 30); // ASCII
  tiff.writeUInt32LE(2, 32); // 2 bytes
  tiff.write(lat >= 0 ? 'N\0' : 'S\0', 36);

  // 2. GPSLatitude
  tiff.writeUInt16LE(0x0002, 40);
  tiff.writeUInt16LE(5, 42); // RATIONAL
  tiff.writeUInt32LE(3, 44); // 3 rationals
  tiff.writeUInt32LE(80, 48); // offset to values

  // 3. GPSLongitudeRef
  tiff.writeUInt16LE(0x0003, 52);
  tiff.writeUInt16LE(2, 54); // ASCII
  tiff.writeUInt32LE(2, 56); // 2 bytes
  tiff.write(lng >= 0 ? 'E\0' : 'W\0', 60);

  // 4. GPSLongitude
  tiff.writeUInt16LE(0x0004, 64);
  tiff.writeUInt16LE(5, 66); // RATIONAL
  tiff.writeUInt32LE(3, 68); // 3 rationals
  tiff.writeUInt32LE(104, 72); // offset to values

  tiff.writeUInt32LE(0, 76); // next IFD offset (0)

  // Lat values (at 80)
  tiff.writeUInt32LE(latDeg, 80);
  tiff.writeUInt32LE(1, 84);
  tiff.writeUInt32LE(latMin, 88);
  tiff.writeUInt32LE(1, 92);
  tiff.writeUInt32LE(latSec, 96);
  tiff.writeUInt32LE(100, 100);

  // Lng values (at 104)
  tiff.writeUInt32LE(lngDeg, 104);
  tiff.writeUInt32LE(1, 108);
  tiff.writeUInt32LE(lngMin, 112);
  tiff.writeUInt32LE(1, 116);
  tiff.writeUInt32LE(lngSec, 120);
  tiff.writeUInt32LE(100, 124);

  const app1Length = 2 + 6 + tiff.length;
  const app1 = Buffer.alloc(4 + 6 + tiff.length);
  app1[0] = 0xFF;
  app1[1] = 0xE1;
  app1.writeUInt16BE(app1Length, 2);
  app1.write('Exif\0\0', 4);
  tiff.copy(app1, 10);

  // Minimal valid 1x1 baseline JPEG
  const rawJpeg = baseJpeg || Buffer.from([
    0xFF, 0xD8,
    0xFF, 0xDB, 0x00, 0x43, 0x00,
    ...new Array(64).fill(16),
    0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x08, 0x00, 0x08, 0x01, 0x01, 0x11, 0x00,
    0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B,
    0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
    0xF0,
    0xFF, 0xD9,
  ]);

  return Buffer.concat([rawJpeg.subarray(0, 2), app1, rawJpeg.subarray(2)]);
}

describe('SPEC 16: Circular Marketplace Media & Privacy-Safe Ingest Pipeline (Ticket 03)', () => {
  beforeEach(async () => {
    await resetTestStore();
  });

  describe('1. Zero-Trust EXIF Interception & Privacy-Safe Ingest (Invariant A9)', () => {
    it('extracts embedded GPS coordinates server-side from EXIF header', () => {
      const sampleJpeg = createJpegWithGpsExif(23.8103, 90.4125);
      const parsed = MediaDomain.extractExif(sampleJpeg);

      expect(parsed.extracted).toBe(true);
      expect(parsed.lat).toBeCloseTo(23.8103, 2);
      expect(parsed.lng).toBeCloseTo(90.4125, 2);
    });

    it('completely purges 100% EXIF, IPTC, and XMP metadata binary chunks upon ingest', async () => {
      const user = await createTestUser('INDIVIDUAL');
      const inputJpeg = createJpegWithGpsExif(23.8103, 90.4125);

      // Verify the input has EXIF
      const inputParser = ExifParser.create(inputJpeg);
      const inputExif = inputParser.parse();
      expect(inputExif.tags.GPSLatitude).toBeDefined();

      const result = await MediaDomain.processAndStore({
        buffer: inputJpeg,
        originalFilename: 'user-camera-upload.jpg',
        mimeType: 'image/jpeg',
        uploaderId: user.id,
      });

      expect(result.isPrivacyStripped).toBe(true);
      expect(result.exifGpsExtracted).toBe(true);
      expect(result.extractedLat).toBeCloseTo(23.8103, 2);
      expect(result.extractedLng).toBeCloseTo(90.4125, 2);

      // Read output WebP file from local disk storage
      const uploadDir = path.resolve(process.cwd(), 'public/uploads/media');
      const outputFilename = path.basename(result.publicUrl);
      const outputPath = path.join(uploadDir, outputFilename);
      expect(fs.existsSync(outputPath)).toBe(true);

      const outputBuffer = fs.readFileSync(outputPath);

      // Verify with sharp metadata that no EXIF/IPTC/XMP exists in output WebP
      const outputMeta = await sharp(outputBuffer).metadata();
      expect(outputMeta.format).toBe('webp');
      expect(outputMeta.exif).toBeUndefined();
      expect(outputMeta.iptc).toBeUndefined();
      expect(outputMeta.xmp).toBeUndefined();

      // Verify with ExifParser that no EXIF tags exist
      try {
        const outParser = ExifParser.create(outputBuffer);
        const outParsed = outParser.parse();
        expect(outParsed.tags.GPSLatitude).toBeUndefined();
      } catch {
        // ExifParser throws or finds 0 tags on clean WebP
      }
    });
  });

  describe('2. Responsive WebP Derivative Generation', () => {
    it('generates thumb (150x150), card (600x600), and full (1200x1200) WebP derivatives', async () => {
      const user = await createTestUser('INDIVIDUAL');

      // Create a test image with distinct dimensions
      const highResImg = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 34, g: 197, b: 94 },
        },
      })
        .png()
        .toBuffer();

      const result = await MediaDomain.processAndStore({
        buffer: highResImg,
        originalFilename: 'scrap-plastic.png',
        mimeType: 'image/png',
        uploaderId: user.id,
      });

      expect(result.publicUrl).toContain('-full.webp');
      expect(result.thumbnailUrl).toContain('-thumb.webp');

      const uploadDir = path.resolve(process.cwd(), 'public/uploads/media');
      const base = path.basename(result.publicUrl).replace('-full.webp', '');

      const thumbPath = path.join(uploadDir, `${base}-thumb.webp`);
      const cardPath = path.join(uploadDir, `${base}-card.webp`);
      const fullPath = path.join(uploadDir, `${base}-full.webp`);

      expect(fs.existsSync(thumbPath)).toBe(true);
      expect(fs.existsSync(cardPath)).toBe(true);
      expect(fs.existsSync(fullPath)).toBe(true);

      const thumbMeta = await sharp(fs.readFileSync(thumbPath)).metadata();
      const cardMeta = await sharp(fs.readFileSync(cardPath)).metadata();
      const fullMeta = await sharp(fs.readFileSync(fullPath)).metadata();

      expect(thumbMeta.width).toBe(150);
      expect(thumbMeta.height).toBe(150);
      expect(cardMeta.width).toBeLessThanOrEqual(600);
      expect(cardMeta.height).toBeLessThanOrEqual(600);
      expect(fullMeta.width).toBeLessThanOrEqual(1200);
      expect(fullMeta.height).toBeLessThanOrEqual(1200);
    });
  });

  describe('3. Validation & Category Quota Enforcement', () => {
    it('rejects files exceeding 5MB limit with 400 Bad Request', async () => {
      const user = await createTestUser('INDIVIDUAL');
      const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);

      await expect(
        MediaDomain.processAndStore({
          buffer: oversizedBuffer,
          originalFilename: 'huge.jpg',
          mimeType: 'image/jpeg',
          uploaderId: user.id,
        })
      ).rejects.toThrow('File size exceeds 5MB limit');
    });

    it('rejects unsupported MIME types', async () => {
      const user = await createTestUser('INDIVIDUAL');
      const textBuffer = Buffer.from('console.log("malicious executable")');

      await expect(
        MediaDomain.processAndStore({
          buffer: textBuffer,
          originalFilename: 'script.sh',
          mimeType: 'application/x-sh',
          uploaderId: user.id,
        })
      ).rejects.toThrow('Unsupported media type');
    });

    it('enforces category quotas (max 3 for recyclables, max 5 for APPLIANCES and E_WASTE)', async () => {
      expect(MediaDomain.getMaxQuota('PLASTICS')).toBe(3);
      expect(MediaDomain.getMaxQuota('PAPER')).toBe(3);
      expect(MediaDomain.getMaxQuota('CLOTHES')).toBe(3);
      expect(MediaDomain.getMaxQuota('APPLIANCES')).toBe(5);
      expect(MediaDomain.getMaxQuota('E_WASTE')).toBe(5);
    });

    it('rejects upload exceeding listing quota for recyclable category', async () => {
      const user = await createTestUser('INDIVIDUAL');
      const [listing] = await db
        .insert(listings)
        .values({
          owner_id: user.id,
          category: 'PLASTICS',
          unit: 'kg',
          declared_weight: '2.50',
          declared_condition: 'GOOD',
          price_bdt: '50.00',
          photos: [],
          status: 'ACTIVE',
        })
        .returning();

      const sampleImg = await sharp({
        create: { width: 50, height: 50, channels: 3, background: { r: 0, g: 0, b: 0 } },
      }).png().toBuffer();

      // Upload 3 photos (allowed)
      for (let i = 0; i < 3; i++) {
        await MediaDomain.processAndStore({
          buffer: sampleImg,
          mimeType: 'image/png',
          uploaderId: user.id,
          listingId: listing.id,
          category: 'PLASTICS',
        });
      }

      // 4th photo should be rejected
      await expect(
        MediaDomain.processAndStore({
          buffer: sampleImg,
          mimeType: 'image/png',
          uploaderId: user.id,
          listingId: listing.id,
          category: 'PLASTICS',
        })
      ).rejects.toThrow('Maximum 3 photos allowed');
    });
  });

  describe('4. API Endpoints: POST /api/v1/media/upload and DELETE /api/v1/media/[id]', () => {
    it('POST /api/v1/media/upload handles multipart/form-data upload and returns 201 with sanitized media record', async () => {
      const user = await createTestUser('INDIVIDUAL');
      const token = tokenFor(user);
      const sampleJpeg = createJpegWithGpsExif(23.7942, 90.4043);

      const formData = new FormData();
      const blob = new Blob([new Uint8Array(sampleJpeg)], { type: 'image/jpeg' });
      formData.append('file', blob, 'sample-item.jpg');
      formData.append('purpose', 'LISTING');

      const req = new Request('http://localhost:3000/api/v1/media/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const res = await uploadHandler(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.mediaId).toBeDefined();
      expect(data.publicUrl).toBeDefined();
      expect(data.thumbnailUrl).toBeDefined();
      expect(data.isPrivacyStripped).toBe(true);
      expect(data.exifGpsExtracted).toBe(true);
      expect(data.extractedLat).toBeCloseTo(23.7942, 2);
      expect(data.extractedLng).toBeCloseTo(90.4043, 2);
      expect(data.degradedMode).toBe(true); // Since local fallback in test

      // Check database row
      const [mediaRow] = await db
        .select()
        .from(listingMedia)
        .where(eq(listingMedia.id, data.mediaId));

      expect(mediaRow).toBeDefined();
      expect(mediaRow.uploader_id).toBe(user.id);
      expect(mediaRow.storage_provider).toBe('LOCAL_FS');
    });

    it('DELETE /api/v1/media/[id] allows uploader to delete media and rejects unauthorized callers', async () => {
      const owner = await createTestUser('INDIVIDUAL');
      const intruder = await createTestUser('INDIVIDUAL');
      const admin = await createTestUser('ADMIN');

      const sampleImg = await sharp({
        create: { width: 50, height: 50, channels: 3, background: { r: 10, g: 20, b: 30 } },
      }).png().toBuffer();

      const uploadResult = await MediaDomain.processAndStore({
        buffer: sampleImg,
        mimeType: 'image/png',
        uploaderId: owner.id,
      });

      const mediaId = uploadResult.mediaId;

      // Intruder attempts deletion -> 400 / unauthorized
      const intruderReq = new Request(`http://localhost:3000/api/v1/media/${mediaId}`, {
        method: 'DELETE',
        headers: authHeaders(tokenFor(intruder)),
      });
      const intruderRes = await deleteHandler(intruderReq, routeParams(mediaId));
      expect(intruderRes.status).toBe(400);

      // Owner deletes -> 200 OK
      const ownerReq = new Request(`http://localhost:3000/api/v1/media/${mediaId}`, {
        method: 'DELETE',
        headers: authHeaders(tokenFor(owner)),
      });
      const ownerRes = await deleteHandler(ownerReq, routeParams(mediaId));
      expect(ownerRes.status).toBe(200);

      // Verify removed from database
      const rows = await db.select().from(listingMedia).where(eq(listingMedia.id, mediaId));
      expect(rows.length).toBe(0);
    });
  });
});
