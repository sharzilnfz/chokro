# 02 — Deepen F3 Smart Geo-Dispatch & Route Optimizer Module

**What to build:** Consolidate pickup dispatch, fleet capacity filtering, e-waste license verification, Mapbox TSP matrix routing, and stop sequence assignments into a single deep Pickup Logistics module. Keep Mapbox Directions Matrix API behind a clean adapter seam with in-memory Haversine fallback.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] Unify fleet capacity evaluation, radius gating, and e-waste license checks in `DispatchDomain`
- [x] Implement clean routing adapter seam separating Mapbox Directions Matrix API from Haversine fallback
- [x] Connect atomic pickup booking, stop sequencing, and ETA calculation behind `bookPickup` and `getCollectorRoute`
- [x] Update API routes (`/api/v1/pickups`, `/api/v1/pickups/collector-route`, `/api/v1/pickups/[id]/status`)
- [x] Verify with automated test suite (`pickups-dispatch.test.ts`)
