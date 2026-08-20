# Ticket 07: Verified Deposit Path: Drop Zone Session & Scale Emptying

**Spec:** SPEC 11 (Verified Deposit Path: Drop Zone Session → Deposit → Pending Green Credit [m4 Imran F2])  
**Owner:** `m4` Imran Ahmed Upom  
**Status:** `ready-for-agent`  
**Blocked by:** Ticket 01a (Core Spine), Ticket 04 (Drop-Zone Telemetry)  
**Blocks:** Ticket 08a (Trust Gate Decisions)  

---

## 1. Goal & Context
Close the physical intake corridor from QR scan to pending reward:
1. Turn poster QR into single-use, 15-minute time-bounded `drop_sessions` with partial-unique index per open session per (user, zone).
2. Record `deposit_records` with accepted category verification, unit discipline, declared quantity, and capture-time camera evidence.
3. Mint exactly one `PENDING` `EARN` credit priced from the effective Rate Card entry at declared quantity with `UNIQUE (custody_ref)`.
4. Model zone emptying as a `pickup_orders` task and persist per-category scale readings in `zone_emptying_records`.
5. Distribute verified quantity proportionally across window deposits and compute declared-vs-verified divergence signals for the Trust Gate.

---

## 2. Vertical Tracer Bullet Scope
- **Schema (`packages/db/src/schema.ts`):**
  - Create `drop_sessions` (`id`, `zone_id`, `user_id`, `session_secret`, `short_code`, `status`, `expires_at`, `created_at`).
  - Create `deposit_records` (`id`, `session_id`, `zone_id`, `user_id`, `category`, `unit`, `declared_quantity`, `verified_quantity`, `evidence_url`, `rate_card_entry_id`, `estimated_bdt`, `verified_bdt`, `status`, `divergence_ratio`, `created_at`).
  - Create `zone_emptying_records` (`id`, `zone_id`, `collector_partner_id`, `scale_readings_json`, `emptied_at`, `created_at`).
  - Add `custody_ref` (with unique index) and `rate_card_entry_id` to `credit_txns`.
  - Add source discriminator (`source_type: 'LISTING' | 'DROP_ZONE'`) and `zone_id` to `pickup_orders`.
- **Domain (`apps/api/lib/domain/DepositDomain.ts`, `ZoneEmptyingDomain.ts`):**
  - Session creation & timing-safe validation, single-use database concurrency lock, category/e-waste licence gating, proportional mass apportionment, divergence signal calculation.
- **API Routes (`apps/api/app/api/v1/`):**
  - `POST /api/v1/drop-sessions`
  - `POST /api/v1/deposits`
  - `POST /api/v1/drop-zones/[id]/empty`
- **UI Components & Screens:**
  - Mobile: `apps/mobile/src/screens/QRScannerScreen.tsx` (`M05`) and `apps/mobile/src/screens/DepositFlowScreen.tsx` (`M06`) with countdown badge, category selector, camera-only uploader, pending credit estimate card; `WalletScreen.tsx` (`M13`) showing pending balance.
- **Verification (`apps/api/tests/spec11-verified-deposit.test.ts`):**
  - End-to-end deposit corridor, single-use session locking, Rate Card provenance, proportional bin mass distribution, and divergence calculation.
