# Ticket 03: Listing Media & Privacy-Safe Ingest Pipeline

**Spec:** SPEC 16 (Circular Marketplace Media & Privacy-Safe Ingest Pipeline [m2 Sameer F1])  
**Owner:** `m2` Ahmad Sameer  
**Status:** `ready-for-agent`  
**Blocked by:** Ticket 01a (Core Schema & Seam)  
**Blocks:** Ticket 05 (Hyperlocal Feed), Ticket 06 (Counter-Offer Negotiation)  

---

## 1. Goal & Context
Implement a zero-trust privacy-preserving media ingestion pipeline satisfying Core Invariant A9:
1. Accept image uploads ($\le 5\text{MB}$, JPEG/PNG/WebP) for listings, drop-zone evidence, and dispute proofs.
2. Intercept capture-time GPS coordinates server-side solely for proximity validation.
3. Completely strip all EXIF, IPTC, and XMP metadata binary chunks before storage.
4. Generate responsive WebP derivatives (`thumb` $150 \times 150$, `card` $600 \times 600$, `full` $1200 \times 1200$).
5. Upload to Cloudinary CDN with transparent local filesystem fallback when API credentials are absent.
6. Enforce category media quotas (up to 3 for recyclables, up to 5 for appliances/e-waste).

---

## 2. Vertical Tracer Bullet Scope
- **Schema (`packages/db/src/schema.ts`):**
  - Create `listing_media` table (`id`, `listing_id`, `uploader_id`, `storage_provider`, `public_url`, `thumbnail_url`, `original_filename`, `mime_type`, `byte_size`, `width`, `height`, `exif_gps_extracted`, `extracted_lat`, `extracted_lng`, `is_privacy_stripped`, `created_at`).
- **Domain (`apps/api/lib/domain/MediaDomain.ts`):**
  - EXIF header parsing, binary metadata purge via Sharp, WebP variant encoding, Cloudinary upload stream, and local disk fallback.
- **API Routes (`apps/api/app/api/v1/`):**
  - `POST /api/v1/media/upload`
  - `DELETE /api/v1/media/[id]`
- **UI Components & Screens:**
  - Mobile: Compound `<PhotoUploader>` in `CreateListingScreen.tsx` (`M02`) and `DepositFlowScreen.tsx` (`M06`).
- **Verification (`apps/api/tests/spec16-media-privacy.test.ts`):**
  - Ingesting images with artificial GPS EXIF headers, asserting binary is stripped of 100% EXIF bytes while coordinates are captured, responsive WebP generation, and database linkage.
