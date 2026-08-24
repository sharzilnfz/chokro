# Ticket 01a: Core Schema, Error Taxonomy, Evidence Storage & Test Harness Derivation

**Spec:** SPEC 10 (Loop Closure Manifest & Correctness Debt)  
**Owner:** `m3` Sharzil Nafis (Core Lead)  
**Status:** `ready-for-agent`  
**Blocked by:** None  
**Blocks:** Ticket 01b, Ticket 02, Ticket 03, Ticket 04, Ticket 05, Ticket 06, Ticket 07, Ticket 08a, Ticket 08b, Ticket 09a, Ticket 09b, Ticket 10, Ticket 11  

---

## 1. Goal & Context
Resolve the core correctness debt and structural preconditions required by all downstream specs:
1. Delete hardcoded fallback base prices from the valuation engine (`ValuationDomain.ts`); return explicit `has_published_rate: false` when no rate card entry matches.
2. Introduce a retrievable evidence storage boundary with local filesystem fallback (`evidence_records` / `apps/api/lib/storage/evidence.ts`).
3. Serialise bid sequence numbers atomically and enforce uniqueness on `auction_bids(lot_id, bid_number)`.
4. Implement narrow error taxonomy in persistence seam (`withDb`): map PG constraint violations (`23505`) to 409 Conflict, check/not-null violations (`23514`/`23502`) to 400 Bad Request, and connection failures to 503.
5. Refactor test harness (`apps/api/tests/test-utils.ts`) to derive database schemas and truncation lists directly from Drizzle schema definitions instead of hand-written DDL.
6. Fix zone resolution by coordinates to execute a real bounded Haversine query.
7. **Regression Invariant:** All 21 existing test suites (117 tests) must continue to pass cleanly.

---

## 2. Vertical Tracer Bullet Scope
- **Schema (`packages/db/src/schema.ts`):**
  - Add `evidence_records` table (`id`, `uploader_id`, `storage_path`, `url`, `mime_type`, `byte_size`, `created_at`).
  - Add unique constraint on `auction_bids(lot_id, bid_number)`.
- **Domain (`apps/api/lib/domain/`):**
  - `ValuationDomain.ts`: Remove fallback base price table.
  - `AuctionDomain.ts`: Atomic bid number sequencing with unique constraint error handling.
  - `StorageDomain.ts` / `apps/api/lib/storage/evidence.ts`: Evidence persistence and retrieval.
- **Repository Seam (`apps/api/lib/repos/seam.ts`):**
  - Catch PostgreSQL error codes and throw typed `ConflictError` (409), `BadRequestError` (400), `DatabaseUnavailableError` (503).
- **Test Harness (`apps/api/tests/test-utils.ts`):**
  - Derive table DDL and truncation statements from Drizzle schema.
- **Verification (`apps/api/tests/spec10-core-spine.test.ts`):**
  - Rate card effectivity & missing rate handling.
  - Nearest zone resolution by coordinates.
  - Retrievable evidence storage.
  - Concurrent bid serialisation.
  - Seam error taxonomy (409 on unique conflict vs 503 on DB error).
  - All 21 existing test suites pass.
