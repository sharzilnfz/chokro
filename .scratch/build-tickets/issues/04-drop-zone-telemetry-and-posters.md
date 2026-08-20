# Ticket 04: Drop-Zone Telemetry & Dynamic Poster Infrastructure

**Spec:** SPEC 19 (Drop-Zone Network Telemetry & Print-Ready Poster Infrastructure [m4 Imran F1])  
**Owner:** `m4` Imran Ahmed Upom  
**Status:** `ready-for-agent`  
**Blocked by:** Ticket 01a (Core Schema & Seam)  
**Blocks:** Ticket 07 (Verified Deposit Path)  

---

## 1. Goal & Context
Implement physical-digital drop zone capacity telemetry and cryptographically verifiable printable signage:
1. Model dynamic fill levels based on cumulative deposited mass vs calibrated capacity limit ($C_{\text{max}}$).
2. Maintain snapshot telemetry log (`zone_capacity_logs`).
3. Automatically trigger a high-priority `pickup_orders` collection task to the contracted partner when fill reaches the configured threshold (default 85%).
4. Generate print-ready posters embedding HMAC-SHA256 constant-time signed QR codes, Google Static Maps snippet, and fallback vector SVG canvas.
5. Provide in-app zone locator and admin telemetry endpoints.

---

## 2. Vertical Tracer Bullet Scope
- **Schema (`packages/db/src/schema.ts`):**
  - Create `zone_capacity_logs` table (`id`, `zone_id`, `recorded_fill_kg`, `capacity_percentage`, `status`, `trigger_reason`, `logged_at`).
  - Add `max_capacity_kg`, `current_fill_kg`, `last_emptied_at`, and `contracted_partner_id` columns to `drop_zones`.
- **Domain (`apps/api/lib/domain/DropZoneTelemetryDomain.ts`):**
  - Fill-percentage modeling, threshold breach handler, automatic emptying dispatch creation, HMAC-SHA256 poster generator with Google Static Maps integration and pure SVG fallback.
- **API Routes (`apps/api/app/api/v1/`):**
  - `GET /api/v1/drop-zones/[id]/poster`
  - `GET /api/v1/drop-zones/locator`
  - `POST /api/v1/drop-zones/[id]/telemetry`
  - `GET /api/v1/admin/drop-zones/telemetry` (A03)
- **UI Components & Screens:**
  - Admin Web: `apps/api/app/admin/zone-capacity/page.tsx` (`A03`) and `apps/api/app/admin/drop-zones/page.tsx` (`A02`).
  - Mobile: `apps/mobile/src/screens/QRScannerScreen.tsx` (`M05`) with fill status badge.
- **Verification (`apps/api/tests/spec19-zone-telemetry.test.ts`):**
  - Fill percentage telemetry updates, auto-empty dispatch trigger at $\ge 85\%$, constant-time HMAC validation, and vector SVG poster generation.
