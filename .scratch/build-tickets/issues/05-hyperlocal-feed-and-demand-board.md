# Ticket 05: Hyperlocal Feed & Reverse Recycler Demand Board

**Spec:** SPEC 17 (Hyperlocal Discovery, Radius Feed & Reverse Recycler Demand Board [m2 Sameer F2, F3])  
**Owner:** `m2` Ahmad Sameer  
**Status:** `ready-for-agent`  
**Blocked by:** Ticket 01a (Core Schema), Ticket 03 (Listing Media Pipeline)  
**Blocks:** Ticket 06 (Counter-Offer Negotiation)  

---

## 1. Goal & Context
Implement distance-aware marketplace discovery and an active standing demand matching engine:
1. Pure SQL Haversine trigonometric distance ranking compatible with PGlite.
2. Thana facets and radius filtering ($1\text{km}, 3\text{km}, 5\text{km}, 10\text{km}$) with OpenStreetMap Nominatim reverse geocoding.
3. Standing demand registry for recyclers (`buyer_demands`) specifying category, target quantity, price cap, and target Thanas.
4. Synchronous event-driven match dispatcher generating `demand_matches` records immediately upon listing creation (`POST /api/v1/listings`).
5. OneSignal push notification integration with in-app notification queue fallback via notification seam.

---

## 2. Vertical Tracer Bullet Scope
- **Schema (`packages/db/src/schema.ts`):**
  - Create `buyer_demands` (`id`, `buyer_id`, `category`, `min_quantity`, `max_quantity`, `unit`, `max_price_per_unit_bdt`, `target_thana`, `target_lat`, `target_lng`, `max_radius_km`, `status`, `expires_at`, `created_at`).
  - Create `demand_matches` (`id`, `demand_id`, `listing_id`, `match_score`, `distance_km`, `notification_sent`, `status`, `created_at`).
  - Add `lat`, `lng`, `thana`, and `zilla` columns to `listings`.
- **Domain (`apps/api/lib/domain/FeedDomain.ts`, `DemandBoardDomain.ts`):**
  - Haversine calculation in SQL, Thana reverse geocoding with polygon fallback, synchronous demand match evaluation, push alert dispatcher.
- **API Routes (`apps/api/app/api/v1/`):**
  - `GET /api/v1/listings/feed` (with radius and Thana filters)
  - `POST /api/v1/demands`
  - `GET /api/v1/demands/matches`
- **UI Components & Screens:**
  - Mobile: `apps/mobile/src/screens/FeedScreen.tsx` (`M01`) with `<RadiusSlider>` and `<ThanaPickerModal>`; `apps/mobile/src/screens/DemandsScreen.tsx` (`M11`) with demand composer and matches inbox.
- **Verification (`apps/api/tests/spec17-feed-and-demands.test.ts`):**
  - Haversine radius filter returning only items within $5\text{km}$ circle, and automatic `demand_matches` generation on creating matching listings.
