# Chokro Sprint 1 (Walking Skeleton Demo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify Chokro Sprint 1 Walking Skeleton Demo: monorepo with Drizzle ORM PostgreSQL backend, Next.js API & Admin Web Console, Expo React Native mobile app, email auth/RBAC, listing CRUD, rate card console, append-only wallet ledger, and QR drop-zone poster generator.

**Architecture:** pnpm workspace monorepo with Turborepo (`apps/api`, `apps/mobile`, `packages/db`, `packages/shared`). Drizzle ORM handles database migrations and queries. Route Handlers in Next.js serve both mobile app endpoints and admin web pages.

**Tech Stack:** Node.js 22.13+, pnpm 11, Next.js 16.3 + React 19.2 + Turbopack, Expo SDK 57 + React Native 0.86, Drizzle ORM 0.45, PostgreSQL (`postgres` driver), Zod 4, TypeScript 6.0, Jest API contract harness.

## Global Constraints

- **Five Next-Life Paths:** `REUSE`, `DONATE`, `REPAIR`, `RESELL`, `RECYCLE`.
- **9 Categories:** `CLOTHES`, `BOOKS`, `PLASTICS`, `PAPER`, `METAL`, `GLASS`, `FURNITURE`, `APPLIANCES`, `E_WASTE`.
- **Drizzle ORM:** All database access must use Drizzle ORM in `packages/db`. No raw SQL strings without typed schema.
- **Append-only Wallet Ledger:** Wallet balance is derived (`SUM(credit_txns)`). Balance mutations are forbidden.
- **DoE License Gate:** Partners requesting `e_waste_licensed` MUST submit a `doe_license_doc`.
- **Authentication:** OD-1 is ratified as email + password. Public signup always creates an `INDIVIDUAL`; partner/admin roles are granted only through controlled server workflows.
- **Backend:** OD-2 is ratified as Next.js Route Handlers + PostgreSQL + Drizzle ORM.
- **QR Scope:** Sprint 1 validates signed Drop Zone tokens and generates scannable posters. Deposit evidence and pending credits remain Sprint 2; no placeholder may claim a deposit succeeded.
- **Compatibility:** Expo SDK-pinned native versions override generic `latest` versions. No canary/beta packages.
- **Commit Author Attribution:** Commits for tickets must pass `--author="<Member Name> <<email>>"`.

---

### Task 0: Monorepo Scaffold, Drizzle Database Setup & Test Harness (Member C)

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `packages/db/package.json`
- Create: `packages/db/drizzle.config.ts`
- Create: `packages/db/src/schema.ts`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/src/seed.ts`
- Create: `packages/shared/package.json`
- Create: `packages/shared/src/index.ts`
- Create: `apps/api/package.json`
- Create: `apps/api/app/api/health/route.ts`
- Create: `apps/api/tests/harness.test.ts`
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/App.tsx`

**Interfaces:**
- Consumes: None (Root scaffold)
- Produces: `db` exports (`users`, `partners`, `listings`, `rateCardEntries`, `dropZones`, `creditTxns`), `shared` exports (`RoleEnum`, `CategoryEnum`, `PathEnum`), `api` health endpoint (`GET /api/health`).

- [ ] **Step 1: Write Drizzle schema and export package**

Create `packages/db/src/schema.ts` with Drizzle definitions for `users`, `partners`, `listings`, `rateCardEntries`, `dropZones`, and `creditTxns`.

- [ ] **Step 2: Write DB Seed script**

Create `packages/db/src/seed.ts` to seed 1 Admin (`admin@chokro.org`), 1 Demo User (`user@chokro.org`), 1 Partner (`partner@chokro.org`), and 3 initial Rate Card entries (`PLASTICS`, `CLOTHES`, `E_WASTE`).

- [ ] **Step 3: Write health check route and test harness**

Create `apps/api/app/api/health/route.ts` and `apps/api/tests/harness.test.ts` to verify API and DB connectivity.

- [ ] **Step 4: Verify test harness passes**

Run: `npm test` or `pnpm test`
Expected: Health test returns `{ status: "ok", db: "connected" }`.

- [ ] **Step 5: Commit T0**

```bash
git add .
git commit --author="Member C <member.c@chokro.org>" -m "feat(T0): monorepo scaffold, drizzle schema, seed script, and test harness"
```

---

### Task 1: Identity, Auth & RBAC (TA1 — Member A)

**Files:**
- Create: `apps/api/app/api/auth/signup/route.ts`
- Create: `apps/api/app/api/auth/login/route.ts`
- Create: `apps/api/app/api/auth/me/route.ts`
- Create: `apps/api/lib/auth.ts`
- Create: `apps/api/tests/auth.test.ts`
- Create: `apps/mobile/src/screens/LoginScreen.tsx`
- Create: `apps/mobile/src/screens/SignupScreen.tsx`

**Interfaces:**
- Consumes: `packages/db` (`users`), `packages/shared` (`RoleEnum`)
- Produces: `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, JWT verification helper `verifyAuthHeader(req)`

- [ ] **Step 1: Write failing Auth tests**

Write `apps/api/tests/auth.test.ts` testing signup, login password hashing, JWT generation, and 403 response for non-admin on admin routes.

- [ ] **Step 2: Implement Auth API endpoints**

Implement JWT token generation, bcrypt password hashing, and user profile retrieval in `apps/api/app/api/auth/`.

- [ ] **Step 3: Implement Mobile Login/Signup screens**

Implement Expo React Native screens for Login and Signup in `apps/mobile/src/screens/`.

- [ ] **Step 4: Verify Auth tests pass**

Run: `npm test -- auth.test.ts`
Expected: All signup, login, and RBAC tests PASS.

- [ ] **Step 5: Commit TA1**

```bash
git add apps/api/app/api/auth apps/api/lib/auth.ts apps/api/tests/auth.test.ts apps/mobile/src/screens
git commit --author="Member A <member.a@chokro.org>" -m "feat(TA1): email auth, jwt sessions, rbac middleware, and mobile login screens"
```

---

### Task 2: Listing CRUD & Dual-Unit Fields (TB1 — Member B)

**Files:**
- Create: `apps/api/app/api/listings/route.ts`
- Create: `apps/api/app/api/listings/[id]/route.ts`
- Create: `apps/api/tests/listings.test.ts`
- Create: `apps/mobile/src/screens/CreateListingScreen.tsx`

**Interfaces:**
- Consumes: `packages/db` (`listings`), `packages/shared` (`CategoryEnum`, `UnitEnum`, `PathEnum`)
- Produces: `POST /api/listings`, `GET /api/listings/[id]`, `PATCH /api/listings/[id]`

- [ ] **Step 1: Write failing Listing CRUD tests**

Write `apps/api/tests/listings.test.ts` to test creating listings across 9 categories, validating dual units (`kg` vs `piece`), and status changes (`DRAFT`, `ACTIVE`, `CANCELLED`).

- [ ] **Step 2: Implement Listing API routes**

Implement CRUD handlers with Zod validation in `apps/api/app/api/listings/route.ts`.

- [ ] **Step 3: Implement Mobile Create Listing Screen**

Create Expo React Native form screen with category selector, category-derived weight/piece inputs, and photo selection preview.

- [ ] **Step 4: Verify Listing tests pass**

Run: `npm test -- listings.test.ts`
Expected: PASS with complete validation check for dual-unit fields.

- [ ] **Step 5: Commit TB1**

```bash
git add apps/api/app/api/listings apps/api/tests/listings.test.ts apps/mobile/src/screens/CreateListingScreen.tsx
git commit --author="Member B <member.b@chokro.org>" -m "feat(TB1): listing CRUD API, dual unit validation, and mobile create listing screen"
```

---

### Task 3: Admin Rate Card Console & Versioning (TC1 — Member C)

**Files:**
- Create: `apps/api/app/api/admin/rate-card/route.ts`
- Create: `apps/api/app/api/rate-card/published/route.ts`
- Create: `apps/api/app/admin/rate-card/page.tsx`
- Create: `apps/api/tests/ratecard.test.ts`

**Interfaces:**
- Consumes: `packages/db` (`rateCardEntries`)
- Produces: `POST /api/admin/rate-card` (creates new rate row & updates `effective_from`), `GET /api/rate-card/published` (returns active effective rates)

- [ ] **Step 1: Write failing Rate Card tests**

Write `apps/api/tests/ratecard.test.ts` verifying rate card creation, versioning (`effective_from`), and that published view returns only current rates.

- [ ] **Step 2: Implement Rate Card Admin API & Published API**

Implement rate insertion and versioning querying using Drizzle in `apps/api/app/api/admin/rate-card/route.ts`.

- [ ] **Step 3: Implement Admin Web Rate Card Page**

Create Next.js Admin page in `apps/api/app/admin/rate-card/page.tsx` with rate editing form and version history table.

- [ ] **Step 4: Verify Rate Card tests pass**

Run: `npm test -- ratecard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit TC1**

```bash
git add apps/api/app/api/admin/rate-card apps/api/app/api/rate-card/published apps/api/app/admin/rate-card apps/api/tests/ratecard.test.ts
git commit --author="Member C <member.c@chokro.org>" -m "feat(TC1): admin rate card console, versioning with effective_from, and published view"
```

---

### Task 4: Wallet & Append-Only Ledger (TD1 — Member D)

**Files:**
- Create: `apps/api/app/api/wallet/balance/route.ts`
- Create: `apps/api/app/api/wallet/transactions/route.ts`
- Create: `apps/api/app/api/admin/wallet/adjust/route.ts`
- Create: `apps/api/tests/wallet.test.ts`
- Create: `apps/mobile/src/screens/WalletScreen.tsx`

**Interfaces:**
- Consumes: `packages/db` (`creditTxns`)
- Produces: `GET /api/wallet/balance` (`pending` and `verified` derived from `SUM(amount)`), `POST /api/admin/wallet/adjust`

- [ ] **Step 1: Write failing Wallet Ledger invariant test**

Write `apps/api/tests/wallet.test.ts` verifying `balance == SUM(ledger)`, ledger append-only constraints (no updates/deletes), and admin adjust route with mandatory reason.

- [ ] **Step 2: Implement Wallet Ledger API endpoints**

Implement Drizzle summation query for balance and transaction history listing in `apps/api/app/api/wallet/`.

- [ ] **Step 3: Implement Mobile Wallet Screen**

Create Expo React Native screen showing user's pending credits, verified credits, and transaction history.

- [ ] **Step 4: Verify Wallet tests pass**

Run: `npm test -- wallet.test.ts`
Expected: PASS with invariant verification.

- [ ] **Step 5: Commit TD1**

```bash
git add apps/api/app/api/wallet apps/api/app/api/admin/wallet apps/api/tests/wallet.test.ts apps/mobile/src/screens/WalletScreen.tsx
git commit --author="Member D <member.d@chokro.org>" -m "feat(TD1): wallet append-only ledger, balance derivation invariant, and mobile wallet screen"
```

---

### Task 5: Drop-Zone Registry & QR Poster Generation (TD2 — Member D)

**Files:**
- Create: `apps/api/app/api/drop-zones/route.ts`
- Create: `apps/api/app/api/drop-zones/[id]/poster/route.ts`
- Create: `apps/api/tests/dropzones.test.ts`
- Create: `apps/mobile/src/screens/QRScannerScreen.tsx`

**Interfaces:**
- Consumes: `packages/db` (`dropZones`)
- Produces: `POST /api/drop-zones`, `GET /api/drop-zones/resolve?token=...`, `GET /api/drop-zones/[id]/poster` (returns printable poster HTML with a scannable signed QR token)

- [ ] **Step 1: Write failing Drop-Zone & QR tests**

Write `apps/api/tests/dropzones.test.ts` testing admin-only zone creation, opaque signed token generation (Crypto HMAC), token resolution, tamper rejection, and poster layout endpoint.

- [ ] **Step 2: Implement Drop-Zone APIs & Poster Route**

Implement zone registration, token resolution, and print-ready HTML poster generation with an embedded QR image in `apps/api/app/api/drop-zones/`.

- [ ] **Step 3: Implement Mobile QR Scanner Screen**

Create an Expo Camera screen that scans a Drop Zone QR and shows the resolved zone name, status, and accepted categories. Do not create a Deposit or wallet credit in Sprint 1.

- [ ] **Step 4: Verify Drop-Zone tests pass**

Run: `npm test -- dropzones.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit TD2**

```bash
git add apps/api/app/api/drop-zones apps/api/tests/dropzones.test.ts apps/mobile/src/screens/QRScannerScreen.tsx
git commit --author="Member D <member.d@chokro.org>" -m "feat(TD2): drop-zone registry, signed qr tokens, poster generator, and mobile qr scanner"
```

---

### Task 6: Partner Application & Verification Queue (TA2 — Member A)

**Files:**
- Create: `apps/api/app/api/partners/apply/route.ts`
- Create: `apps/api/app/api/admin/partners/route.ts`
- Create: `apps/api/app/api/admin/partners/[id]/verify/route.ts`
- Create: `apps/api/tests/partner.test.ts`
- Create: `apps/api/app/admin/partners/page.tsx`

**Interfaces:**
- Consumes: `packages/db` (`partners`)
- Produces: `POST /api/partners/apply`, `POST /api/admin/partners/[id]/verify` (`e_waste_licensed` check)

- [ ] **Step 1: Write failing Partner verification tests**

Write `apps/api/tests/partner.test.ts` asserting that attempting to set `e_waste_licensed = true` without a valid `doe_license_doc` fails with `HTTP 400 Bad Request`.

- [ ] **Step 2: Implement Partner Application & Admin Queue APIs**

Implement partner registration, document check, and admin approve/reject handlers in `apps/api/app/api/partners/`.

- [ ] **Step 3: Implement Admin Partner Queue Web UI**

Create Next.js Admin page in `apps/api/app/admin/partners/page.tsx` for reviewing partner documents and granting verification.

- [ ] **Step 4: Verify Partner tests pass**

Run: `npm test -- partner.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit TA2**

```bash
git add apps/api/app/api/partners apps/api/app/api/admin/partners apps/api/tests/partner.test.ts apps/api/app/admin/partners
git commit --author="Member A <member.a@chokro.org>" -m "feat(TA2): partner application flow, doe license gate, and admin verification queue"
```

---

### Task 7: Browse Feed & Filters (TB2 — Member B)

**Files:**
- Create: `apps/api/app/api/feed/route.ts`
- Create: `apps/api/tests/feed.test.ts`
- Create: `apps/mobile/src/screens/FeedScreen.tsx`

**Interfaces:**
- Consumes: `packages/db` (`listings`)
- Produces: `GET /api/feed` (cursor-paginated listing feed filtered by category, condition, status)

- [ ] **Step 1: Write failing Browse Feed tests**

Write `apps/api/tests/feed.test.ts` testing cursor pagination and filter parameters (`category`, `condition`).

- [ ] **Step 2: Implement Cursor-Paginated Feed API**

Implement feed route with Drizzle cursor pagination in `apps/api/app/api/feed/route.ts`.

- [ ] **Step 3: Implement Mobile Feed Screen**

Create Expo React Native feed screen with filter chips and infinite scrolling list in `apps/mobile/src/screens/FeedScreen.tsx`.

- [ ] **Step 4: Verify Feed tests pass**

Run: `npm test -- feed.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit TB2**

```bash
git add apps/api/app/api/feed apps/api/tests/feed.test.ts apps/mobile/src/screens/FeedScreen.tsx
git commit --author="Member B <member.b@chokro.org>" -m "feat(TB2): cursor-paginated browse feed API and mobile feed screen with filters"
```

---

### Task 8: Sprint 1 Verification & Integration Gate (T1 — Team Lead / All)

**Files:**
- Create: `tests/e2e/sprint1-walking-skeleton.test.ts`

**Interfaces:**
- Consumes: All APIs (`auth`, `listings`, `rate-card`, `wallet`, `drop-zones`, `partners`, `feed`)
- Produces: Complete E2E Sprint 1 test report

- [ ] **Step 1: Write full Walking Skeleton E2E integration test**

Write end-to-end user flow: Admin seeds rate card -> User signs up -> User creates plastic listing -> Partner applies & gets verified -> User checks feed -> User checks wallet ledger.

- [ ] **Step 2: Execute full test suite and type check**

Run: `npm test && npm run typecheck`
Expected: All unit, integration, and E2E tests PASS. 0 TypeScript errors.

- [ ] **Step 3: Final Sprint 1 Commit**

```bash
git add .
git commit -m "chore(T1): sprint 1 walking skeleton verification gate passed"
```
