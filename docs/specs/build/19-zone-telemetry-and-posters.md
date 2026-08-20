# SPEC 19 — Drop-Zone Network Telemetry & Print-Ready Poster Infrastructure

**Status:** build spec  
**Owner:** m4 (Imran Ahmed Upom) · Feature 1 (Retrofit)  
**Depends on:** SPEC 10 (invariants, cryptographic QR tokens, error taxonomy), SPEC 11 (deposit sessions)  
**Blocks:** SPEC 11 (poster QR anchors physical deposit sessions)  
**Maps to:** Feature slate §5 (m4 Imran F1) · PRD §2.5 / A8 (Campus Drop Infrastructure)  

---

## Problem Statement

Campus drop bins and decentralized physical collection points face two critical operational vulnerabilities:

1. **Unmonitored Overflow & Capacity Blind Spots:** Without automated telemetry, drop zones overflow silently. When a bin is overflowing, users discard recyclables onto the ground or revert to dumping in municipal trash. Admins currently have no dashboard tracking cumulative volume, fill velocity, or the elapsed time since the last collection run.
2. **Static Unverifiable Signage:** Physical posters in public areas are easily vandalized, forged, or relocated. A simple printed URL or static QR code allows malicious actors to paste counterfeit QR stickers over genuine bins. Furthermore, printable signage requires localized visual context: clear accepted material iconography, host institution branding, and an embedded micro-map confirming the bin's designated physical location.

Under the CSE471 academic rubric, basic drop-zone CRUD or viewing a static table reads as generic admin maintenance. The platform requires an **Integrated Drop-Zone Telemetry & Dynamic Poster Generation Engine**.

---

## Solution

A dual telemetry and cryptographic asset generation subsystem:

### 1. Drop-Zone Capacity Telemetry & Automated Emptying Trigger
- **Dynamic Fill-Rate Modeling:** Calculates current zone fill percentage based on cumulative net kilograms deposited (from SPEC 11) relative to the zone's calibrated capacity limit ($C_{\text{max}}$).
- **Periodic Snapshot Logging (`zone_capacity_logs`):** Records fill levels, deposit counts, and status transitions.
- **Automated High-Capacity Dispatch Trigger:** When a zone reaches $\ge 85\%$ capacity, the system automatically creates a high-priority `pickup_orders` collection task assigned to the zone's contracted partner organization, preventing bin overflow before it occurs.

### 2. Print-Ready Dynamic Poster Generator
- **Cryptographic Signed QR Invariant:** Renders an HMAC-SHA256 signed opaque QR token:
  $$\text{QR Token} = \text{HMAC-SHA256}(\text{zone\_id} \parallel \text{institution\_id} \parallel \text{secret})$$
  Validated at scan time using `crypto.timingSafeEqual` to prevent timing attacks.
- **Embedded Location Map Integration:** Calls **Google Static Maps API** to generate a high-resolution map snippet centered on the drop zone's exact latitude and longitude, with a custom pin and campus boundary overlay.
- **Vector Poster Canvas:** Renders print-ready A4/A3 formats with institutional branding, accepted category badges, DoE compliance notices, and emergency contact details.
- **Degraded Fallback:** If Google Static Maps is unavailable or unconfigured, the poster generator compiles a pure SVG vector graphic with coordinate grid lines and embedded cryptographic QR codes.

---

## User Stories

### Zone Telemetry & Operations
1. As a campus sustainability officer / zone host, I want to see the current estimated fill percentage and recent deposit velocity of my campus bins.
2. As a platform administrator, I want to receive an automated notification when a drop zone exceeds 85% capacity.
3. As the system, I want an emptying pickup task automatically dispatched to the contracted collector when a zone reaches threshold capacity.
4. As an admin, I want to mark a zone as `PAUSED` or `MAINTENANCE` to immediately stop the QR scanner from accepting new deposit sessions.

### Poster Generation & In-App Locator
5. As an admin, I want to generate a print-ready PDF/PNG poster for any drop zone with one click, complete with map, QR code, and category rules.
6. As a student scanning the poster, I want to see the exact campus building and zone name confirmed in-app.
7. As a student looking for a nearby bin, I want to browse an in-app map/list of active drop zones with real-time fill indicators (e.g., "Plenty of space" vs "Nearly full").

---

## Implementation Decisions

### Database Schema (`packages/db/src/schema.ts`)

```ts
// Drop Zone Capacity Telemetry & Emptying History
export const zoneCapacityLogs = pgTable('zone_capacity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  zone_id: uuid('zone_id').notNull().references(() => dropZones.id),
  recorded_fill_kg: decimal('recorded_fill_kg', { precision: 10, scale: 2 }).notNull(),
  capacity_percentage: integer('capacity_percentage').notNull(), // 0 to 100
  status: varchar('status', { length: 30 }).default('NORMAL').notNull(), // NORMAL, APPROACHING_CAPACITY, FULL, OVERFLOW_ALARM
  trigger_reason: varchar('trigger_reason', { length: 60 }).notNull(), // DEPOSIT_ACCUMULATION, MANUAL_OVERRIDE, COLLECTOR_EMPTYING
  logged_at: timestamp('logged_at').defaultNow().notNull(),
});

// Drop zone schema additions:
// max_capacity_kg (decimal), current_fill_kg (decimal), last_emptied_at (timestamp), contracted_partner_id (uuid references partners.id)
```

### API Routes & Interfaces

1. `GET /api/v1/drop-zones/[id]/poster`
   - **Auth:** Admin / Zone Host (`requireAuth`)
   - **Query:** `?format=png|svg|pdf&size=A4|A3`
   - **Behavior:** Fetches zone metadata, requests static map tile from Google Static Maps (or renders local SVG fallback), embeds HMAC QR code, and streams print-ready document.
2. `GET /api/v1/drop-zones/locator`
   - **Auth:** Public / Authenticated
   - **Query:** `?lat=23.774&lng=90.425&radiusKm=3`
   - **Returns:** List of active drop zones with fill levels, accepted categories, and distances.
3. `POST /api/v1/drop-zones/[id]/telemetry`
   - **Auth:** Admin / Sensor Webhook (`requireAdmin`)
   - **Body:** `{ currentFillKg: number, triggerReason: string }`
   - **Behavior:** Updates `dropZones.current_fill_kg`, writes `zoneCapacityLogs`, and auto-triggers emptying dispatch if $\text{fill} \ge 85\%$.

### External Integration & Fallback Specification

- **Primary API:** Google Static Maps API (`https://maps.googleapis.com/maps/api/staticmap?center=...&zoom=16&size=600x300&markers=color:green|...&key=...`).
- **Graceful Fallback:** When `GOOGLE_STATIC_MAPS_KEY` is missing or fails:
  - Logs `[POSTER_MAP_DEGRADED_MODE] Generating vector grid fallback poster`.
  - Replaces external raster map with a stylized SVG campus coordinate plaque and vector icon banner.
  - Returns `degradedMode: true` in metadata headers.

---

## Rubric Defense & Innovation Claims

* **Innovation Claim (5/5 Marks):** Dynamic physical-digital synchronization uniting telemetry-driven capacity modeling, automated preemptive logistics dispatch, and cryptographic visual poster generation.
* **Banned-List Defense:** Defends the **Physical-World Infrastructure Gate**. Replaces static CRUD with an automated capacity threshold event loop and constant-time verified HMAC security tokens.
* **Seam Verification:** Evaluated with Jest against PGlite by adding simulated deposits to a drop zone until fill exceeds 85%, asserting that a `zoneCapacityLogs` row with `APPROACHING_CAPACITY` is created and a corresponding `pickup_orders` task is spawned.
