# SPEC 17 — Hyperlocal Discovery, Radius Feed & Reverse Recycler Demand Board

**Status:** build spec  
**Owner:** m2 (Ahmad Sameer) · Features 2 & 3  
**Depends on:** SPEC 10 (invariants, error taxonomy), SPEC 16 (sanitized media pipeline)  
**Blocks:** SPEC 18 (counter-offer negotiations occur over discovered listings and matched demands)  
**Maps to:** Feature slate §3 (m2 Sameer F2 & F3) · PRD §2.10 (Decentralized Logistics)  

---

## Problem Statement

Two structural problems cripple standard circular classifieds platforms:

1. **Distance-Insensitive Feed:** Transporting low-value, high-bulk scrap (e.g., 20kg of glass or 50kg of paper) across cities is economically unviable. A buyer in Mirpur cannot realistically collect scrap from Uttara or Narayanganj. Traditional classifieds show nationwide chronological feeds without distance-aware sorting or local administrative boundaries (Thanas and Wards). Furthermore, test suites run on **PGlite**, where PostGIS spatial extensions are unavailable, requiring distance calculations to be mathematically sound and SQL-native.
2. **Passive Supply vs. Active Industrial Demand:** In a circular economy, recyclers and aggregators have standing commercial requirements (e.g., "We require 500 kg of copper scrap at $\ge ৳750/\text{kg}$ in the Tejgaon/Mohakhali industrial belt"). Under the old model, recyclers must refresh listing feeds manually all day. The marketplace must invert this model: allowing recyclers to post standing demands and automatically matching new listings to demands at the instant of creation.

---

## Solution

A two-part subsystem unifying **Hyperlocal Geo-Discovery** and the **Reverse Recycler Demand Board**:

### Part 1: Hyperlocal Discovery & Radius Filter (Sameer F2)
- **Nominatim Reverse Geocoding:** When a listing is created, its latitude and longitude are mapped to Bangladesh administrative units (`division`, `district`, `thana`, `ward`) via **OpenStreetMap Nominatim API**.
- **PGlite-Safe Haversine Querying:** The discovery feed computes great-circle distance between the browsing user's coordinates and active listings directly in SQL:
  $$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lng}}{2}\right)}\right)$$
- **Radius Slider:** Enables filtering by $1\text{km}$, $3\text{km}$, $5\text{km}$, and $10\text{km}$ radiuses, alongside Thana facets.

### Part 2: Reverse Demand Board & Instant Auto-Matching Engine (Sameer F3)
- **Standing Demand Registry:** Recyclers post structured demands (`buyer_demands`) specifying category, minimum/maximum target quantity, maximum unit price they will pay, target Thanas, and validity TTL.
- **Synchronous Match Dispatcher:** Upon listing creation (`POST /api/v1/listings`), a domain event evaluates all active demands matching the category, quantity threshold, and geographic radius.
- **Match Records & Instant Alerts:** Qualifying matches generate immutable `demand_matches` rows and trigger push notifications via **OneSignal / Webhook**, allowing the recycler to claim or make a binding offer with one tap.

---

## User Stories

### Hyperlocal Browsing & Discovery
1. As a scrap buyer/collector, I want to filter listings within a $1\text{km} - 10\text{km}$ radius of my current location, so that I only see pickups I can realistically service.
2. As a user, I want to filter listings by Thana (e.g. Dhanmondi, Gulshan, Mirpur), so that I can browse my local community.
3. As a user, I want each listing card to display its calculated distance in kilometers and its Thana name, so that proximity is instantly visible.
4. As the system, I want reverse geocoding to resolve coordinates to Thana names reliably using OpenStreetMap Nominatim with offline fallback.

### Standing Demands & Auto-Matching
5. As a verified recycler, I want to post a standing demand (e.g., 500kg of Aluminium at up to ৳220/kg in Dhaka North), so that I don't have to manually hunt for listings.
6. As a recycler, I want to pause, edit, or close my active demands at any time.
7. As a seller publishing a new scrap listing, I want the system to automatically match my listing with interested recyclers.
8. As a recycler, I want to receive an instant push notification and in-app alert when a new listing matches my standing demand.
9. As a recycler, I want to see all matched listings in a dedicated "Demand Matches" inbox with match scores.

---

## Implementation Decisions

### Database Schema (`packages/db/src/schema.ts`)

```ts
// Recycler Standing Demands
export const buyerDemands = pgTable('buyer_demands', {
  id: uuid('id').defaultRandom().primaryKey(),
  buyer_id: uuid('buyer_id').notNull().references(() => users.id),
  category: varchar('category', { length: 50 }).notNull(),
  min_quantity: decimal('min_quantity', { precision: 10, scale: 2 }).notNull(),
  max_quantity: decimal('max_quantity', { precision: 10, scale: 2 }),
  unit: varchar('unit', { length: 20 }).notNull(), // kg, piece
  max_price_per_unit_bdt: decimal('max_price_per_unit_bdt', { precision: 10, scale: 2 }).notNull(),
  target_thana: varchar('target_thana', { length: 120 }), // e.g. "Dhanmondi", "Tejgaon"
  target_lat: doublePrecision('target_lat'),
  target_lng: doublePrecision('target_lng'),
  max_radius_km: integer('max_radius_km').default(10).notNull(),
  status: varchar('status', { length: 30 }).default('ACTIVE').notNull(), // ACTIVE, PAUSED, FULFILLED, EXPIRED
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Auto-Match Records between Listings and Demands
export const demandMatches = pgTable('demand_matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  demand_id: uuid('demand_id').notNull().references(() => buyerDemands.id),
  listing_id: uuid('listing_id').notNull().references(() => listings.id),
  match_score: decimal('match_score', { precision: 4, scale: 2 }).notNull(), // 0.00 to 1.00
  distance_km: decimal('distance_km', { precision: 10, scale: 2 }),
  notification_sent: boolean('notification_sent').default(false).notNull(),
  status: varchar('status', { length: 30 }).default('UNNOTICED').notNull(), // UNNOTICED, VIEWED, OFFERED, DECLINED
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Location metadata additions to listings
// columns: lat (doublePrecision), lng (doublePrecision), thana (varchar 120), zilla (varchar 120)
```

### API Routes & Interfaces

1. `GET /api/v1/listings/feed`
   - **Query:** `?lat=23.7925&lng=90.4078&radiusKm=5&category=METAL&thana=Dhanmondi&sort=distance|price|newest`
   - **Behavior:** Executes native SQL Haversine query against active listings, returning distance, Thana, and thumbnail media.
2. `POST /api/v1/demands`
   - **Auth:** Verified Partner / Buyer (`requireAuth`)
   - **Body:** `{ category, minQuantity, unit, maxPricePerUnitBdt, targetThana?, targetLat, targetLng, maxRadiusKm, durationDays }`
   - **Returns:** `{ demandId: string, status: 'ACTIVE', expiresAt: string }`
3. `GET /api/v1/demands/matches`
   - **Auth:** Demand Owner (`requireAuth`)
   - **Query:** `?demandId=[id]&status=UNNOTICED|VIEWED`
   - **Returns:** List of matched listings with calculated distance, photos, and match scores.

### External Integration & Fallback Specification

- **Primary Geocoding API:** OpenStreetMap Nominatim (`https://nominatim.openstreetmap.org/reverse?lat=...&lon=...&format=json`).
- **Primary Push Notification API:** OneSignal REST API (`https://onesignal.com/api/v1/notifications`).
- **Graceful Fallbacks:**
  - If Nominatim fails or rate-limits: System matches against stored campus / Dhaka polygon lookup tables.
  - If OneSignal fails or is offline: Match rows are saved with `notification_sent: false`, and an in-app notification row is queued in `messages`/`notifications` for retrieval on next app open.

---

## Rubric Defense & Innovation Claims

* **Innovation Claim (5/5 Marks):** Algorithmic supply-demand matching inversion combined with high-performance PGlite-compatible spatial trigonometric querying. Recyclers specify purchase criteria upfront, converting passive classifieds into an active dispatch exchange.
* **Banned-List Defense:** Defends **Decentralized Logistics Optimization** and industrial material routing. It is not generic listing CRUD; it is an automated bilateral event matching engine.
* **Seam Verification:** Evaluated with Jest against PGlite by populating 3 distinct geographic listings and asserting that the Haversine radius filter returns only the points within the $5\text{km}$ circle, and that creating a matching listing automatically generates a `demand_matches` row.
