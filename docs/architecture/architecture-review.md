# Chokro Monorepo — Architecture Review & Deepening Plan

**Date:** 2026-08-11  
**Branch:** `refactor/architecture-review`  
**HTML Visual Report:** [`architecture-review.html`](./architecture-review.html)

---

## 1. Executive Summary

This architecture review evaluated the module depth, interfaces, seams, leverage, adapters, and locality across the Chokro monorepo (`apps/api`, `apps/mobile`, `packages/db`, `packages/shared`, `apps/api/app/admin`).

Five deepening candidates were surfaced, focused on transforming shallow modules into deep ones, eliminating leaky seams, improving locality, and establishing clean test interfaces without environment-bound branching.

---

## 2. Architecture Review Candidates

### Candidate 1: Eliminate Dual-Implementation Repos — Deepen `@chokro/db`
- **Recommendation Strength:** **Strong**
- **Files Involved:**
  - `packages/db/src/index.ts`
  - `apps/api/lib/database.ts`
  - `apps/api/lib/repos/*.ts`
- **Problem:** Every repository method contains two complete implementations — one for Drizzle SQL and one for in-memory arrays — selected at runtime by `databaseOrTestStore()` checking `NODE_ENV === 'test'`.
  - Adding a query filter requires modifying both branches.
  - The memory branch silently diverges from SQL query behavior.
  - `memoryStore` relies on `any[]` array manipulation without type safety.
  - `packages/db` exposes raw Drizzle table symbols, forcing handlers/repos to build raw queries.
- **Solution:** Define explicit repository interfaces in `@chokro/db` and provide separate `Drizzle*Adapter` and `Memory*Adapter` implementations. Modules accept repository interfaces, isolating SQL and memory logic into separate adapters. Delete `databaseOrTestStore`.
- **Benefits:**
  - *Locality:* Changing a query affects only one adapter in one file.
  - *Leverage:* Tests swap adapters cleanly at the seam without global state or `NODE_ENV` hacks.

---

### Candidate 2: Deepen Route Handlers — Absorb Shallow Services
- **Recommendation Strength:** **Strong**
- **Files Involved:**
  - `apps/api/lib/services/listingService.ts`
  - `apps/api/lib/services/walletService.ts`
  - `apps/api/app/api/listings/route.ts`
  - `apps/api/app/api/auth/*/route.ts`
  - `apps/api/lib/auth.ts`
- **Problem:** `listingService` and `walletService` are thin pass-throughs that fail the deletion test (4 out of 5 methods are 1-line forwarding calls to repos). Meanwhile, route handlers perform Zod validation, auth, password hashing/JWT signing, business rules, and response formatting inline.
- **Solution:** Create deep domain modules (e.g., `listingDomain`, `authDomain`) that encapsulate validation, status state transitions, permissions, and repository interactions. Route handlers become pure HTTP adapters (request parsing -> domain invocation -> response formatting).
- **Benefits:**
  - *Locality:* All business rules live in dedicated domain modules.
  - *Leverage:* Auth and domain operations become reusable across REST routes, admin handlers, and automated tests without HTTP dependencies.

---

### Candidate 3: Seal Mobile Network Seam — Encapsulate Auth Tokens
- **Recommendation Strength:** **Worth exploring**
- **Files Involved:**
  - `apps/mobile/src/services/api.ts`
  - `apps/mobile/src/context/AuthContext.tsx`
  - `apps/mobile/src/hooks/*.ts` (`useFeed`, `useWallet`, `useRateCard`, `useCreateListing`, `useEstimate`)
- **Problem:** `apiRequest()` in `services/api.ts` requires callers to manually pass `{ token }`. Every hook imports `useAuth()`, extracts `token`, passes `{ token }` to `apiRequest`, and sets `enabled: !!token`.
- **Solution:** Encapsulate token retrieval directly within `apiRequest` (via a token provider/storage listener). Hooks stop destructuring and forwarding `token` boilerplate.
- **Benefits:**
  - *Locality:* Changing auth headers or token refresh mechanisms touches only `services/api.ts`.
  - *Leverage:* Simplifies all data-fetching hooks across the app.

---

### Candidate 4: Consolidate Category/Unit Domain Logic into `@chokro/shared`
- **Recommendation Strength:** **Worth exploring**
- **Files Involved:**
  - `packages/shared/src/dto/listings.ts`
  - `apps/mobile/src/types.ts`
  - `apps/api/app/admin/lib/formatters.ts`
  - `apps/api/app/admin/drop-zones/categories.ts`
- **Problem:** The domain rule (`APPLIANCES` & `E_WASTE` use `piece`; all others use `kg`) is duplicated in 3 separate places:
  1. `packages/shared/src/dto/listings.ts` (Zod `superRefine`)
  2. `apps/mobile/src/types.ts` (`unitForCategory`)
  3. `apps/api/app/admin/lib/formatters.ts` (`unitForCategory`)
- **Solution:** Create a category domain module in `@chokro/shared` exporting canonical mappings, `unitForCategory()`, and `formatLabel()`.
- **Benefits:**
  - *Locality:* Adding or modifying categories requires editing a single file in `@chokro/shared`.

---

### Candidate 5: Delete Dead Re-Export Files in Mobile
- **Recommendation Strength:** **Speculative**
- **Files Involved:**
  - `apps/mobile/src/api.ts`
  - `apps/mobile/src/storage.ts`
- **Problem:** `src/api.ts` and `src/storage.ts` are 1-line re-exports from `src/services/api` and `src/services/storage`. Deleting them concentrates no complexity and removes confusing duplicate import targets.
- **Solution:** Delete `src/api.ts` and `src/storage.ts` and update import statements to target `src/services/*`.

---

## 3. Implementation Sequence & Next Steps

1. **Phase 1 (Core Foundation):** Execute Candidate #1 (repo interfaces & adapters in `@chokro/db`).
2. **Phase 2 (API Layer Refactoring):** Execute Candidate #2 (domain modules absorbing shallow services and fat route handlers).
3. **Phase 3 (Domain Consolidation & Mobile Polish):** Execute Candidate #4 (category domain in `@chokro/shared`) and Candidate #3 (encapsulated auth tokens in mobile API client).
