# Chokro (চক্র) — LLM Fast-Context & Architecture Guide
> **Purpose**: Ultra-dense, token-efficient system briefing for AI coding agents. Read this file first to gain 100% architectural, domain, schema, and API context in ~2,500 tokens without crawling or grepping the codebase.

---

## 1. Executive Summary & Core Philosophy
**Chokro** (*চক্র* = Cycle/Circle) is a circular economy and smart recycling platform in Bangladesh connecting households/students, verified recycling partners, and corporate/university campuses.
- **Core Loop**: Users list recyclables/items or drop them at physical campus QR drop zones → dynamic rate card calculates value → items are collected/verified → users earn Green Wallet credits (BDT equivalent) via an immutable, append-only transaction ledger.
- **Engineering Principles**: Surgical diffs (touch only what's needed), deep domain seams (thin route handlers, domain logic in `lib/domain/`), compile-time & runtime invariant enforcement (Zod DTOs), and zero speculative complexity.

---

## 2. Monorepo Map & File Locations

```
/
├── apps/
│   ├── api/                              # Next.js 16 App Router (REST API + Web Admin at /admin)
│   │   ├── app/api/                      # Route handlers (auth, feed, listings, partners, rate-card, drop-zones, wallet, admin)
│   │   ├── app/admin/                    # Web Admin Console pages & components (data via useAdminResource factory; states via AdminNotice / AdminResourceState)
│   │   ├── lib/
│   │   │   ├── domain/                   # Pure business logic. route→domain is the corridor; domains NEVER import @chokro/db (eslint-enforced)
│   │   │   ├── repos/                    # Drizzle ORM queries wrapped in withDb() boundary (seam.ts). All persistence lives here
│   │   │   ├── LedgerMath.ts             # Single ledger balance row-classifier (Verified/Pending sums)
│   │   │   ├── auth.ts                   # JWT sign/verify, bcrypt hashing, requireAuth, requireAdmin
│   │   │   ├── http.ts                   # safeRoute wrapper, CORS, standard JSON responses (apiSuccess, apiError)
│   │   │   ├── notify.ts                 # Notification dispatch; recipient resolved via injectable ContactResolver adapter
│   │   │   └── qr.ts                     # HMAC-SHA256 drop-zone token generator & timing-safe validator
│   │   └── tests/                        # Jest test suites using in-memory PGlite engine
│   └── mobile/                           # React Native 0.86 + Expo SDK 57 Mobile App
│       ├── src/
│       │   ├── components/               # UI components (ListingCard, RateCardRow, TransactionItem, PhotoUploader)
│       │   ├── screens/                  # Tab screens (FeedScreen, CreateListingScreen, RateCardScreen, WalletScreen, QRScannerScreen)
│       │   ├── contexts/AuthContext.tsx  # Global auth session, token persistence, 401 unauth interceptor
│       │   ├── services/                 # api.ts (HTTP client with token provider), storage.ts (expo-secure-store)
│       │   └── hooks/                    # React Query hooks (useFeed, useEstimate, useWallet, useDropZone)
│       └── App.tsx                       # Root wrapper (QueryClientProvider -> AuthProvider -> AppShell)
├── packages/
│   ├── db/                               # Database package
│   │   ├── src/schema.ts                 # Drizzle PostgreSQL schemas, relationships, and enums
│   │   ├── src/ddl.ts                    # PGlite DDL GENERATED from the Drizzle schema (never hand-edited)
│   │   ├── src/seed/                     # Seed data split into numbered scenario modules (01-campuses … 19-gamification)
│   │   └── src/index.ts                  # DB client initialization (postgres driver / PGlite switch)
│   └── shared/                           # Universal TypeScript types & validation
│       ├── src/enums/                    # MaterialCategory, NextLifePath, ItemCondition, Unit, UserRole, etc.
│       ├── src/rules/                    # Domain invariants (weight vs. piece category maps)
│       └── src/dto/                      # Zod DTO schemas: request shapes here; server→client response shapes in src/dto/response/
└── docs/                                 # Product specs (00-product-capability.md wins), architecture & ADRs
```

---

## 3. Tech Stack & Commands Cheat Sheet

| Layer | Stack | Key Packages |
| :--- | :--- | :--- |
| **Workspace & Build** | pnpm 11 + Turborepo + Nx | `pnpm` (package manager), `turbo`, `nx` |
| **Backend & Admin** | Next.js 16 (App Router) + React 19 | `next` ^16.3.0, `zod` ^4.4.3, `jsonwebtoken`, `bcryptjs`, `qrcode` |
| **Database & ORM** | PostgreSQL 17 / PGlite + Drizzle ORM | `drizzle-orm` ^0.45.2, `postgres`, `@electric-sql/pglite` (WASM in-memory) |
| **Mobile Client** | React Native 0.86 + Expo SDK 57 | `expo` ~57.0.11, `nativewind` ^4.2.6 (Tailwind v3), `react-native-reanimated` |
| **State & Cache** | TanStack React Query v5 | `@tanstack/react-query` |
| **Testing** | Jest 30 + ts-jest + in-memory PGlite | `jest`, `ts-jest` (zero Docker setup needed for running unit/API tests!) |

### Essential CLI Commands
```bash
pnpm install                 # Install dependencies
pnpm dev                     # Start API (localhost:3000) and Mobile bundler concurrently
pnpm --filter @chokro/api dev     # Start API server only
pnpm --filter @chokro/mobile start# Start Expo mobile app
pnpm test                    # Run all tests — 40 suites / 324 tests (cached by Nx when inputs unchanged)
pnpm test:changed            # Run tests only for modified files (fastest for agent loops)
pnpm run affected:test       # Run tests only for git-affected packages
pnpm db:setup                # Run Drizzle migrations & seed data
pnpm typecheck               # Typecheck entire monorepo
```

---

## 4. Domain Model & Strict Invariants

### 1. Categories & Measurement Units Invariant
*Enforced via `@chokro/shared` Zod `.superRefine()`:*
- **Piece Categories (`unit: 'piece'`)**: `APPLIANCES`, `E_WASTE`.
  - Requires `pieceCount` (positive integer). `declaredWeight` must be null/omitted.
- **Weight Categories (`unit: 'kg'`)**: `CLOTHES`, `BOOKS`, `PLASTICS`, `PAPER`, `METAL`, `GLASS`, `FURNITURE`.
  - Requires `declaredWeight` (positive decimal). `pieceCount` must be null/omitted.

### 2. The 5 Next-Life Paths
`REUSE` | `DONATE` | `REPAIR` | `RESELL` | `RECYCLE`

### 3. Condition Bands
`EXCELLENT` | `GOOD` | `FAIR` | `POOR`

### 4. Immutable Append-Only Ledger (`credit_txns`)
- **NEVER mutate or update user balances directly.**
- Verified Balance = `SUM(amount)` where `status = 'VERIFIED'`; Pending Balance = `SUM(amount)` where `status = 'PENDING'`.
- `lib/LedgerMath.ts` is the **single** balance row-classifier; wallet and settlement repos both consume it (no re-implementations).
- Ledger status flips (`mintPending` / `verify` / `reject` / `compensate`) have a **single owner**: `CreditVerificationDomain`, which also owns the typed custody-ref codec (`encodeCustodyRef`: `CUSTODY-DEP-*`, `CUSTODY-PICKUP-*`, `REDEMPTION-*`). Compensating entries use `REVERSAL-*` refs via `SettlementDomain.reverseRedemption()`.
- Transaction kinds: `EARN` (deposits/sales), `REDEEM` (cashout/coupons), `ADJUST` (admin manual adjustment).

### 5. Trust Gate & E-Waste Licensing
- Earnings stay in `PENDING` status until verified by a physical collection scan or QR Drop Zone confirmation.
- `TrustGateDomain.evaluate(subject, signals, thresholds)` is the **pure decision core**; it lives inside `CreditVerificationDomain`, which applies the ledger flip. The evaluate route accepts only a subject reference (`subjectType` + `subjectId`) — signals/flags are always server-derived, never caller-supplied.
- Partners requesting `E_WASTE` handling **must** submit a Department of Environment license (`doe_license_doc`). Admin must inspect and approve before `e_waste_licensed` flag is activated.

### 6. Drop Zone QR Token Security
- QR Token format: `<base64url_json_payload>.<hmac_sha256_hex_signature>`.
- Signed with `QR_SECRET` and validated with `crypto.timingSafeEqual`.

---

## 5. Complete Database Schema Reference (`packages/db`)

```ts
// 1. users
users {
  id: uuid (PK)
  email: varchar(255) (unique)
  password_hash: text
  role: 'INDIVIDUAL' | 'PARTNER' | 'ADMIN'
  institution_id: uuid (optional)
  created_at: timestamp
}

// 2. partners
partners {
  id: uuid (PK)
  user_id: uuid (FK -> users.id)
  org_name: varchar(255)
  types: jsonb // array of PartnerType e.g. ["RECYCLER", "COLLECTOR"]
  e_waste_licensed: boolean (default false)
  status: 'APPLIED' | 'VERIFIED' | 'REJECTED'
  doe_license_doc: text (optional URL/document ref)
  created_at: timestamp
}

// 3. listings
listings {
  id: uuid (PK)
  owner_id: uuid (FK -> users.id)
  category: MaterialCategory
  unit: 'kg' | 'piece'
  declared_weight: decimal(10, 2) (nullable)
  piece_count: integer (nullable)
  declared_condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  photos: jsonb // string[] of image URLs/paths
  status: 'DRAFT' | 'ACTIVE' | 'CANCELLED'
  created_at: timestamp
}

// 4. rate_card_entries
rate_card_entries {
  id: uuid (PK)
  category: MaterialCategory
  condition_band: ItemCondition
  unit: 'kg' | 'piece'
  price_bdt: decimal(10, 2)
  effective_from: timestamp
  updated_by: uuid (FK -> users.id)
}

// 5. drop_zones
drop_zones {
  id: uuid (PK)
  institution_id: uuid (optional)
  name: varchar(255)
  geo_location: jsonb // { lat: number, lng: number }
  qr_token: text (unique signed token)
  accepted_categories: jsonb // MaterialCategory[]
  status: 'ACTIVE'
  created_at: timestamp
}

// 6. credit_txns
credit_txns {
  id: uuid (PK)
  user_id: uuid (FK -> users.id)
  amount: decimal(10, 2)
  kind: 'EARN' | 'REDEEM' | 'ADJUST'
  status: 'PENDING' | 'VERIFIED' | 'REJECTED'
  source_id: varchar(255) (optional reference e.g. listing_id or drop_zone_id)
  reason: text (optional)
  created_at: timestamp
}
```

---

## 6. Backend Patterns & Framework Conventions (`apps/api`)

### 1. Next.js 16 Route Handler Async Params
*In Next.js 16, route parameters are a Promise. Always unpack:*
```ts
export const GET = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  // ...
});
```

### 2. Standard Safe Route Wrapper (`apps/api/lib/http.ts`)
*All API routes must be wrapped with `safeRoute` to ensure CORS, options handling, and 503 fallback:*
```ts
import { safeRoute, apiSuccess, apiError, apiData } from '@/lib/http';

export const POST = safeRoute(async (req: Request) => {
  const user = await requireAuth(req);
  const body = await req.json();
  const result = await SomeDomain.execute(user.id, body);
  return apiData(result, 201);
});
```

### 3. Repository Execution Seam (`apps/api/lib/repos/seam.ts`)
*All Drizzle ORM calls in repos must be wrapped in `withDb`:*
```ts
import { withDb } from './seam';
export const findListingById = (id: string) => withDb(async (db) => {
  return db.select().from(listings).where(eq(listings.id, id)).limit(1);
});
```

### 4. One Error Type, Mapped at the Route Seam (`lib/database.ts`)
*Domains and repos throw a single `DomainRuleError(message, status, details?)` for every rule violation. `safeRoute` catches it and `routeError()` maps it to the HTTP response — no per-domain error classes, no manual try/catch or instanceof blocks in route handlers.*

### 5. Domain Logic Isolation
Route handlers (`app/api/*`) are **thin HTTP controllers**. All validation, state transitions, calculations, and permission checks live in `apps/api/lib/domain/`. Route→domain is the corridor convention — the wallet/listing/feed/media service facades were deleted; transport parsing lives in thin domain seams (`MediaDomain.parseUploadRequest`, `FeedDomain.parseFeedQuery`). Key modules:
- `AuthDomain.ts`: Registration, bcrypt verification, JWT signing.
- `ListingDomain.ts`: Listing creation & status transition guards.
- `PartnerDomain.ts`: Partner applications & DoE license validation.
- `WalletDomain.ts`: Ledger aggregation via LedgerMath, derived balances, manual adjustments.
- `CreditVerificationDomain.ts`: **Single owner** of ledger status flips (`mintPending` / `verify` / `reject` / `compensate`) plus the custody-ref codec; hosts the pure `TrustGateDomain.evaluate` decision core.
- `SettlementDomain.ts`: Payout saga — DB writes run inside real `db.transaction` calls (`settlePayoutAtomic` / `markRedemptionFailedAtomic` repos) with the MFS gateway call outside; `reverseRedemption()` is the single owner of `REVERSAL-*` compensating refs.
- `EscrowDomain.ts`: Explicit `sweepExpiredHolds()` entry point (pure reads never mutate); `releaseToSeller` / `returnToBuyer` take actor id + role and enforce authorization inside the module.
- `KeysetPagination.ts`: Composite cursor encoding (`created_at` + `id`) for stable feed pagination.

**Hard rule**: domain modules must NOT import `@chokro/db` (eslint `no-restricted-imports` enforces this). All persistence goes through `lib/repos/` and the `withDb` seam.

---

## 7. Complete API Route Reference

| Method | Path | Auth | Key Request Body / Query Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Public | `{ email, password, role?, institution_id? }` |
| `POST` | `/api/auth/login` | Public | `{ email, password }` -> returns `{ token, user }` |
| `GET` | `/api/auth/me` | Bearer JWT | None -> returns user profile |
| `GET` | `/api/feed` | Public | `?cursor=...&category=...&condition=...&limit=20` |
| `POST` | `/api/listings` | Bearer JWT | `{ category, unit, declared_weight?, piece_count?, declared_condition, photos }` |
| `GET` | `/api/listings` | Bearer JWT | Returns current user's listings |
| `GET` | `/api/listings/:id` | Bearer JWT | Single listing detail |
| `PATCH`| `/api/listings/:id` | Owner/Admin| `{ status: 'ACTIVE' \| 'CANCELLED' }` |
| `POST` | `/api/partners/apply`| Bearer JWT | `{ org_name, types, doe_license_doc? }` |
| `GET` | `/api/rate-card/published` | Public | Returns current active pricing per category & band |
| `GET` | `/api/rate-card/estimate` | Public | `?category=PLASTICS&condition=GOOD&weight=5.5` |
| `GET` | `/api/drop-zones` | Bearer JWT | List drop zones |
| `POST` | `/api/drop-zones` | Admin JWT | `{ name, geo_location, accepted_categories, institution_id? }` |
| `GET` | `/api/drop-zones/resolve` | Bearer JWT | `?token=...` or `?lat=...&lng=...` |
| `GET` | `/api/drop-zones/:id/poster` | Admin JWT | HTML/SVG printable QR poster |
| `GET` | `/api/wallet/balance` | Bearer JWT | Returns `{ verified: number, pending: number }` |
| `GET` | `/api/wallet/transactions` | Bearer JWT | Returns array of `credit_txns` records |
| `GET` | `/api/admin/partners` | Admin JWT | List all pending/verified partner applications |
| `POST` | `/api/admin/partners` | Admin JWT | `{ partner_id, action: 'VERIFY' \| 'REJECT', e_waste_licensed? }` |
| `GET` | `/api/admin/rate-card` | Admin JWT | Full rate card history |
| `POST` | `/api/admin/rate-card` | Admin JWT | `{ category, condition_band, unit, price_bdt }` |
| `POST` | `/api/admin/wallet/adjust` | Admin JWT | `{ user_id, amount, reason }` |
| `GET` | `/api/health` | Public | Health status check |

---

## 8. Frontend Architecture & Flow (`apps/mobile`)

### Structure & Navigation
- **Shell**: `apps/mobile/src/AppShell.tsx` provides 5 tabs:
  1. `browse`: `FeedScreen.tsx` — category chips, infinite list (`useFeed`), `ListingCard`.
  2. `list`: `CreateListingScreen.tsx` — dynamic form (piece count vs. weight), client image compressor (`lib/photo.ts`), live valuation calculation card (`EstimatorCard` via `useEstimate`).
  3. `rates`: `RateCardScreen.tsx` — published rate card table with category filter.
  4. `wallet`: `WalletScreen.tsx` — Verified (Green) vs. Pending (Amber) cards, ledger history list.
  5. `scan`: `QRScannerScreen.tsx` — Expo Camera QR scanner, token resolver (`useDropZone`).
- **Auth & Storage**:
  - `AuthContext.tsx` holds user session and registers `setOnUnauthorized(logout)`.
  - `apps/mobile/src/services/api.ts` attaches `setAuthTokenProvider(() => session?.token)`.
  - Hooks type their React Query results from the shared response DTOs (`FeedPage`, `BalanceSummary`, `CreditTransactionDto`, … exported from `@chokro/shared` `src/dto/response/`) — no hand-duplicated response types.
  - Image upload compresses to max 1600px, quality 0.7, <500 KB payload before submitting.

---

## 9. Fast-Start Prompt Template for Expensive Agents
*Copy-paste this snippet to initialize a new session with an expensive agent to save context window and avoid discovery queries:*

```text
You are working on Chokro, a circular economy & smart recycling platform (Next.js 16 API + React Native Expo mobile app + Drizzle ORM + PostgreSQL/PGlite).
- Read AGENT_GUIDE.md for complete architecture, domain invariants, schema, and API catalog.
- Rules: Unit invariants (APPLIANCES/E_WASTE = piece; all others = kg), Wallet balance is derived from immutable credit_txns (never mutated), API route handlers are thin and wrapped in safeRoute, Next.js 16 params are async Promise, DB queries run via withDb seam, domains never import @chokro/db, rule violations throw DomainRuleError (mapped by routeError).
- Write surgical diffs, no unnecessary abstractions. Test with 'pnpm test'.
```
