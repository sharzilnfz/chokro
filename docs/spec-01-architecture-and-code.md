# SPEC 01 — Identity, Trust & Partners: Architecture & Code Guide

**Spec:** `docs/specs/01-identity-and-trust.md` · **Owner:** Member A · **Sprint-1 tickets:** TA1, TA2 · **PRD features 1–6**
**Produced:** 2026-08-07 · via parallel subagent analysis of the codebase + manual verification of every referenced file/line.

---

## 1. What SPEC 01 covers

| Area | Spec stories | Tickets |
|---|---|---|
| Email+password auth, server-side session (JWT), RBAC (individual/partner/admin) | 1, 7, 8 | TA1 |
| Profile management, institution linkage, account deletion | 2, 3, 4 | TA1 |
| Admin user management + suspension | 5, 6 | TA1 |
| Partner org registration (types, service areas, DoE license) | 9, 10, 16 | TA2 |
| Admin verification queue (approve/reject with reason) | 11, 14 | TA2 |
| Capability flags + verified badge visible to users | 12, 13 | TA2 |
| In-app + push notifications | 17–20 | TA3 (Sprint 2) |
| Reports & disputes + moderation queue | 21–25 | TA4 (Sprint 3) |

The **notifications** (stories 17–20) and **reports/disputes/moderation** (stories 21–25) subsystems are scheduled for Sprints 2 and 3 respectively and have **no code yet**. This guide documents what exists today: the identity core (auth + RBAC), the partner lifecycle, the admin console, and the mobile auth flow — plus the exact gaps.

---

## 2. Repository layout (the four packages a Member-A change touches)

```
chokro/
├── apps/
│   ├── api/                      Next.js 16 backend + web admin console
│   │   ├── app/api/              REST Route Handlers (the API seam)
│   │   ├── app/admin/            Admin console (Next pages, client components)
│   │   ├── lib/                  Shared server helpers (auth, http, database, repos)
│   │   ├── middleware.ts         Edge CORS middleware
│   │   └── tests/                Jest integration tests at the API seam
│   └── mobile/                   React Native + Expo client
│       └── src/                  context, screens, navigation, services
├── packages/
│   ├── db/                       Drizzle ORM schema, seed, migrations, in-memory test store
│   └── shared/                   Zod enums + DTO schemas consumed by both app and API
└── docs/specs/                   01–04 capability specs + 00 manifest (SPEC 00 wins on conflict)
```

**SPEC 01 file map (what follows explains every one of these):**

```
DATA LAYER
  packages/db/src/schema.ts            users, partners (+ 4 other-spec tables)
  packages/db/src/seed.ts              admin / user / partner demo accounts
  packages/db/src/index.ts             postgres client + memoryStore (test fallback)
  packages/db/drizzle/0001_sprint1_backend.sql
  packages/shared/src/enums/index.ts   RoleEnum, PartnerStatusEnum, ...
  packages/shared/src/dto/auth.ts      SignupSchema, LoginSchema
  packages/shared/src/dto/partners.ts  PartnerApplySchema, VerifyPartnerSchema

API LAYER (auth + RBAC)
  apps/api/middleware.ts               CORS for /api/*
  apps/api/lib/auth.ts                 bcrypt, JWT sign/verify, requireAuth/requireAdmin
  apps/api/lib/http.ts                 safeRoute, apiError/apiSuccess/apiData, CORS
  apps/api/lib/database.ts             DB-or-memory switch, routeError (503)
  apps/api/lib/repos/users.ts          userRepo (findByEmail/findById/create)
  apps/api/app/api/auth/signup/route.ts
  apps/api/app/api/auth/login/route.ts
  apps/api/app/api/auth/me/route.ts

PARTNER LIFECYCLE + ADMIN
  apps/api/lib/repos/partners.ts       partnerRepo (findAll/findById/create/updateStatusAndLicense)
  apps/api/app/api/partners/apply/route.ts
  apps/api/app/api/admin/partners/route.ts   (GET queue / POST verify)
  apps/api/app/admin/layout.tsx        wraps admin pages in <AdminConsole>
  apps/api/app/admin/page.tsx          admin dashboard cards
  apps/api/app/admin/admin-console.tsx session shell + sign-in + request wrapper
  apps/api/app/admin/partners/page.tsx partner queue UI

MOBILE AUTH FLOW
  apps/mobile/App.tsx                  providers (QueryClient > AuthProvider > AppShell)
  apps/mobile/src/context/AuthContext.tsx
  apps/mobile/src/screens/LoginScreen.tsx
  apps/mobile/src/screens/SignupScreen.tsx
  apps/mobile/src/navigation/AppShell.tsx
  apps/mobile/src/services/api.ts      fetch wrapper (Bearer header, 401 hook)
  apps/mobile/src/services/storage.ts  SecureStore (native) / localStorage (web)
  apps/mobile/src/types.ts             User, AuthSession types

TESTS
  apps/api/tests/test-utils.ts         resetTestStore/createTestUser/tokenFor/authHeaders
  apps/api/tests/auth.test.ts          (6 tests)
  apps/api/tests/partner.test.ts       (3 tests)
  apps/api/tests/sprint1-walking-skeleton.test.ts
```

---

## 3. Architectural overview

```
 Mobile (Expo RN)              Admin console (Next.js web)
 +------------------------+    +-------------------------+
 | AuthContext            |    | AdminConsole shell      |
 | Login/Signup screens   |    | Partner queue page      |
 | AppShell (auth gate)   |    | sessionStorage token    |
 +-----------+------------+    +-----------+-------------+
             | Authorization: Bearer <JWT>  |
             v                            v
 +------------------------------------------------------------+
 |  apps/api  Next.js 16 Route Handlers (/api/*)              |
 |  middleware.ts  -> CORS only (no auth at edge)             |
 |  lib/auth.ts    -> requireAuth(401) / requireAdmin(403)    |
 |  lib/http.ts    -> safeRoute (try/catch, CORS, error map)  |
 |  route handlers -> validate with Zod (@chokro/shared)      |
 |  lib/repos/*    -> repository pattern, DB-or-memory switch |
 +----------------------------+------------------------------+
                              v
 +------------------------------------------------------------+
 |  packages/db   PostgreSQL + Drizzle ORM                   |
 |  schema.ts (users, partners, listings, rate_card,         |
 |             drop_zones, credit_txns)                      |
 |  memoryStore  -> in-memory twin for Jest (NODE_ENV=test)  |
 +------------------------------------------------------------+
```

**Key cross-cutting decisions:**

1. **The API seam is the trust boundary.** Next.js edge middleware (`middleware.ts`) does *only* CORS — it never parses tokens. Every protected route calls `requireAuth` / `requireAdmin` from `lib/auth.ts`. Clients are free to gate their own UI; the server is the authority.
2. **Stateless JWT session.** OD-1's "server-side session" is implemented as a signed 7-day JWT (HS256) carrying `{ userId, email, role }`. There is no server session store and no revocable session table — important consequence (see §9, G1).
3. **Repository pattern with a test twin.** `lib/repos/*` functions each take two closures: one against Drizzle/Postgres, one against an in-memory `memoryStore`. `databaseOrTestStore` (`lib/database.ts`) picks based on `NODE_ENV === 'test'`. This is what makes the Jest suites fast and DB-less.
4. **One shared contract (`@chokro/shared`).** Zod schemas for DTOs and enums live in `packages/shared`, imported by route handlers (server) and (selectively) the mobile app. Validation happens server-side; the mobile app only re-uses enum *types*.
5. **Single `role` field on `User`** implements RBAC. Admin accounts are **only** created by `seed.ts` — signup hard-codes `role: 'INDIVIDUAL'` (`signup/route.ts:23`) and a regression test locks that in.

---

## 4. Data layer

### 4.1 `packages/db/src/schema.ts` — the two SPEC-01 tables

**`users` (schema.ts:3–10)**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK, `defaultRandom()` | |
| `email` | `varchar(255)` notNull **unique** | no case normalization |
| `password_hash` | `text` notNull | bcrypt hash |
| `role` | `varchar(50)` notNull, default `'INDIVIDUAL'` | `INDIVIDUAL / PARTNER / ADMIN` (comment on :7) |
| `institution_id` | `varchar(255)` nullable | free-form string; **no FK** — no institution entity exists yet |
| `created_at` | `timestamp`, default `now()` | |

**`partners` (schema.ts:12–21)**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → `users.id` | **single owner** (spec wants org ↔ *one-or-more* logins; today it's 1:1) |
| `org_name` | `varchar(255)` notNull | |
| `types` | `jsonb` notNull | JSON array, e.g. `["COLLECTOR","RECYCLER"]`; **free-form, no enum/CHECK** |
| `e_waste_licensed` | `boolean` notNull default `false` | **the only capability flag that exists** |
| `status` | `varchar(50)` default `'APPLIED'` | `APPLIED / VERIFIED / REJECTED` (comment :18) — **no `UNDER_REVIEW`, no `SUSPENDED`** |
| `doe_license_doc` | `text` nullable | meant as object-storage ref; today holds an arbitrary string (filename/ref/license number) |
| `created_at` | `timestamp` | |

**Observations that matter for Member A:**
- SPEC 00 §7's `Partner` carries `capability_flags{e_waste_licensed, collects, repairs, buys, accepts_donations}` + `service_areas[]`. Only `e_waste_licensed` is modeled; the other four flags and `service_areas` **do not exist** anywhere.
- There is **no DB-level CHECK** tying `e_waste_licensed = true` to a present `doe_license_doc`. The invariant is enforced only in API code (§6.4).
- The remaining tables (`listings`, `rateCardEntries`, `dropZones`, `creditTxns`) belong to specs 02/03/04 — they just reference `users.id`.

### 4.2 `packages/db/src/seed.ts` — admin creation (the ONLY admin path)

- `DEMO_PASSWORD = 'password123'` (:6), local-only.
- `upsertUser(email, role, passwordHash)` (:8–18): `insert ... onConflictDoUpdate(target: users.email)` — idempotent, but on conflict it **overwrites `password_hash` and `role`** (:12–14).
- `seed()` (:20–74): hashes once (:22), then seeds:
  - `admin@chokro.org` → **ADMIN** (:24) ← the only admin-creation path in the repo
  - `user@chokro.org` → INDIVIDUAL (:25)
  - `partner@chokro.org` → PARTNER (:26) plus partner org `BanglaBin Recycling Ltd`, `e_waste_licensed: true`, `doe_license_doc: 'DOE-LICENSE-2026-9912.pdf'`, `status: 'VERIFIED'` (:30–37).
- Also seeds 3 rate-card rows (:40–70) — not SPEC-01.
- `process.exit(0)` on success (:73) — fine for a CLI.

### 4.3 `packages/db/src/index.ts` — client + test store

- Postgres via `postgres` + `drizzle` (:1–2); connection string from `DATABASE_URL` or localhost fallback (:7).
- **`memoryStore`** (:10–17): parallel in-memory arrays for all 6 tables. Used by the Jest suites.
- `db` is only constructed when `NODE_ENV !== 'test'` (:20–21); in tests `db` is `null` and `databaseOrTestStore` routes to `memoryStore`.
- `resetMemoryStore()` (:26–30) empties all arrays for `beforeEach`.

### 4.4 `packages/db/drizzle/0001_sprint1_backend.sql` + `src/migrate.ts`

Hand-written migration for the Sprint-1 invariants only: `pgcrypto` extension, `listings.piece_count`, and an **append-only trigger on `credit_txns`** (blocks UPDATE/DELETE). Note:
- There is **no `0000` migration and no `meta/_journal.json`** — the schema itself is applied with `drizzle-kit push` (schema drift, no versioned audit trail).
- The append-only trigger is a pattern SPEC-01 will want to copy for "dispute resolution writes an immutable note."

### 4.5 `packages/shared/src/enums/index.ts` — shared enums

- `RoleEnum = z.enum(['INDIVIDUAL', 'PARTNER', 'ADMIN'])` (:3) — matches spec exactly.
- `PartnerStatusEnum = z.enum(['APPLIED', 'VERIFIED', 'REJECTED'])` (:28) — only 3 states.
- Others (`CategoryEnum`, `UnitEnum`, `ConditionEnum`, `PathEnum`, `ListingStatusEnum`, `CreditTxn*Enum`) belong to other specs.
- Convenience arrays at :41–49 (`ROLES`, `PARTNER_STATUSES`, ...).
- **Missing:** a `PartnerTypeEnum` (collector/recycler/repair/vendor/NGO) — partner `types` are unvalidated strings.

### 4.6 `packages/shared/src/dto/auth.ts` — auth wire contracts

- `SignupSchema` (:3–9): `email` (zod email), `password min(6)`, `role` enum **default `'INDIVIDUAL'`** — but the schema *advertises* `ADMIN`/`PARTNER` as legal inputs even though the route ignores `role` entirely. Footgun: any future handler that does `parsed.data.role` becomes a self-admin vector. Today it is mitigated (route hard-codes `INDIVIDUAL` + test at `auth.test.ts:11–21`).
- `LoginSchema` (:11–14): `email`, `password` (no rules).

### 4.7 `packages/shared/src/dto/partners.ts` — partner wire contracts

- `VerifyPartnerSchema` (:3–7): `{ partnerId: string, status: 'VERIFIED' | 'REJECTED' }`. **No rejection reason, no `verified_by`, no capability overrides, no `SUSPENDED`.**
- `PartnerApplySchema` (:9–14): `orgName min(2)`, `types: string[] min(1)` (free-form), `eWasteLicensed` default false, `doeLicenseDoc` nullable optional. **No `serviceAreas`, no address, no contact.**

---

## 5. API layer — authentication & RBAC

### 5.1 `apps/api/middleware.ts` (edge middleware, 29 lines)

- Matcher `/api/:path*` (:27–28).
- Preflight `OPTIONS` → `204` with CORS headers (:6–15); all other `/api/*` responses get the same CORS headers appended (:17–21).
- **Does no authentication whatsoever** — no token parsing, no route gating. All auth is per-route via `lib/auth.ts`.
- CORS is `*` with `Authorization` allowed (:12, :18) — consistent with bearer-token auth.

### 5.2 `apps/api/lib/auth.ts` — the auth core (75 lines)

| Export | Lines | Behavior |
|---|---|---|
| `getJwtSecret()` | 8–14 | `JWT_SECRET` env; **throws in production** if unset; dev fallback `'chokro-local-jwt-secret-2026'` (:6) |
| `TokenPayload` | 16–20 | `{ userId, email, role }` |
| `hashPassword` / `comparePassword` | 22–28 | **bcryptjs**, cost factor **10**, **synchronous** (`hashSync`/`compareSync`) |
| `signToken(payload)` | 30–32 | HS256 JWT, `expiresIn: '7d'` |
| `verifyToken(token)` | 34–45 | `jwt.verify`, then **re-validates shape + role** via `RoleEnum.safeParse`; returns `null` on any failure |
| `requireAuth(req)` | 51–57 | no/invalid token → **401** `{error:'Unauthorized'}`; else `{ user }` |
| `requireAdmin(req)` | 59–66 | `requireAuth` first, then `role !== 'ADMIN'` → **403** `{error:'Forbidden'}` |
| `verifyAuthHeader(req)` | 68–74 | parses `Authorization: Bearer <token>` |

**Correct 401/403 semantics:** 401 = unauthenticated; 403 = authenticated but wrong role. These two guards are reused by every protected route in the app (listings, wallet, admin/*, partners/*).

**The single most important security note (G1):** `requireAuth`/`requireAdmin` trust the JWT payload blindly and never re-read the user from the DB. Consequences:
- A suspended user's already-issued token keeps working for up to 7 days.
- A role change (e.g., demotion) does not take effect until re-login.
- **Suspension (story 6) cannot be enforced against live sessions** until `requireAuth` re-checks a `status` column per request — as `/auth/me` already does for existence (`me/route.ts:9`).

### 5.3 `apps/api/lib/http.ts` — response plumbing (50 lines)

- `CORS_HEADERS` (:4–8), `OPTIONS()` (:10–15).
- **`safeRoute(handler)`** (:17–35): wraps any Route Handler in try/catch, injects CORS on success *and* error, maps thrown errors through `routeError`. This is the uniform seam every route uses.
- `apiError(msg, status, details?)` (:37–40), `apiSuccess(msg, data, status?)` (:42–44), `apiData(data, status?)` (:46–48).
- Gotcha: malformed JSON body (`req.json()` throwing) becomes a **500**, not a **400**, because `safeRoute` catches it.

### 5.4 `apps/api/lib/database.ts` (29 lines)

- `DatabaseUnavailableError` (:3–7).
- **`databaseOrTestStore(dbFn, memFn)`** (:9–22): when `NODE_ENV === 'test'` runs the memory closure, else the Drizzle closure, mapping DB errors to `DatabaseUnavailableError`.
- `routeError` (:24–29): DB-unavailable → **503**, anything else → **500**.

### 5.5 `apps/api/lib/repos/users.ts` — `userRepo` (56 lines)

- `findByEmail` (:14–19), `findById` (:21–26), `create` (:28–55) — each wrapped in `databaseOrTestStore`.
- `create` inserts `role: data.role as any` (:37) — no DB-level enum/CHECK on `role`; a future insert path could write an invalid role (mitigated at token-verify time by `RoleEnum.safeParse`).
- **No email normalization, no uniqueness enforcement in the repo** (delegated to the DB unique constraint or the route's pre-check).

### 5.6 `POST /api/auth/signup` (`app/api/auth/signup/route.ts`, 42 lines)

1. `safeRoute` wrapper (:6).
2. `req.json()` (:7) → Zod `SignupSchema.safeParse` (:8); failure → **400** `Invalid input` + `.format()` details (:9–11).
3. `hashPassword(password)` cost 10 (:14).
4. Duplicate check via `userRepo.findByEmail` (:15); if present → **400** `Unable to create account` (:16–18). Message deliberately avoids "email taken" (anti-enumeration on wording) but the 400-vs-201 distinction **still leaks existence** (probeable).
5. Creates the user with **hard-coded `role: 'INDIVIDUAL'`** (:23) and forwards `institutionId` verbatim (:24) — a user **cannot** self-assert PARTNER or ADMIN. No invite-code validation, no profile fields.
6. Signs a 7d JWT `{ userId, email, role }` (:27–31); returns **201** `{ message, user:{id,email,role,institutionId}, token }` (:33–41).

**Not implemented:** email verification, institution invite-code validation, rate limiting, profile fields.

### 5.7 `POST /api/auth/login` (`app/api/auth/login/route.ts`, 40 lines)

1. `LoginSchema.safeParse` (:8); failure → **401** `Invalid credentials` (:10). (A malformed payload gets 401, not 400 — semantically odd but consistent anti-enumeration.)
2. `findByEmail` (:14); no user → 401 (:16–18).
3. `comparePassword` (:20); wrong → 401 (:21–23).
4. Issues same JWT (:25–29); returns **200** `{ user, token }` (:31–39).
- **Enumeration-safe on login** (identical 401 in all failure cases — locked by `auth.test.ts:43–58`). No rate limiting / lockout. **Suspended users can still log in** (no status check).

### 5.8 `GET /api/auth/me` (`app/api/auth/me/route.ts`, 24 lines)

1. `requireAuth` (:6–7) → 401.
2. `userRepo.findById(auth.user.userId)` (:9) — **re-hits the DB** (fresh row, not the stale token).
3. Row missing → 401 (:11–13).
4. Returns `{ user:{ id, email, role, institutionId, createdAt } }` (:15–23).
- No status/suspension check here either.

---


---

## 6. Partner lifecycle & admin verification

### 6.1 `apps/api/lib/repos/partners.ts` — `partnerRepo` (143 lines)

- **`CreatePartnerData`** (:6–17) accepts both snake_case and camelCase keys (`user_id`/`userId`, ...) so callers can use either.
- `findAll()` (:20–25) — all partners, used by the admin queue GET.
- `findByEmail()` (:27–46) — inner-join on `users.email`; **dead code** (no route calls it).
- `findByOwnerId()` (:48–59) — partner by owner; **dead code** (would be the natural "my application status" lookup for applicants — no route exposes it).
- `findById()` (:61–72) — used by verify.
- `create()` (:74–102) — defaults `status: 'APPLIED'` (:79); DB insert with `.returning()` (:91) or memory insert with `crypto.randomUUID()` (:93–99).
- **`updateStatusAndLicense(id, status, eWasteLicenseNumber?)`** (:104–142) — the verification write path:
  - Refetches existing (:105–108).
  - Optional `eWasteLicenseNumber` overwrites `doe_license_doc` (:110–113) — **dead param**, no caller passes it.
  - **The DoE gate** (:115–120, quoted in §6.4).
  - DB update `{ status, e_waste_licensed, doe_license_doc }` (:122–134) or memory mutation (:135–140).

### 6.2 `POST /api/partners/apply` (`app/api/partners/apply/route.ts`, 35 lines)

1. `requireAuth` (:7–8) → 401 for anonymous.
2. `PartnerApplySchema.safeParse` (:11); failure → 400 `Invalid application data` (:12–14).
3. **Apply-time DoE gate** (:18–21): `if (eWasteLicensed && !doeLicenseDoc) -> 400`.
4. Creates partner with `e_waste_licensed: false` **hard-forced** (:29) regardless of the applicant's request, `status: 'APPLIED'` (:31), `doe_license_doc` stored if provided (:30). Returns **201** with the partner row (:34).

**Who can apply:** any authenticated user — no role gate, no "already applied" guard (a user can create unlimited applications), and **no mobile UI exists** to invoke this endpoint yet.

### 6.3 `GET/POST /api/admin/partners` (`app/api/admin/partners/route.ts`, 32 lines)

- **GET** (:6–11): `requireAdmin` → `partnerRepo.findAll()` → `{ partners }`. Returns **all** partners (every status) — the UI filters client-side.
- **POST** (:13–31): `requireAdmin` → `VerifyPartnerSchema.safeParse` (:17; failure → 400) → `findById` (:23; missing → **404** `Partner not found`) → `updateStatusAndLicense(partnerId, status)` (:29) → 200.
- **No rejection reason, no reviewer ID, no approval timestamp are accepted or persisted** — direct conflict with spec story 11 ("approve/reject with a reason") and the impl decision "Record who verified and when" (`01-identity-and-trust.md:60`).

### 6.4 The DoE license gate — where the invariant is enforced

Enforced at **two API layers, never at the DB**:

Apply-time (rejects self-assertion), `apply/route.ts:18–21`:
```ts
if (eWasteLicensed && !doeLicenseDoc) {
  return apiError('DoE License document is mandatory for e-waste licensing.', 400);
}
```

Verify-time (the actual grant), `partners.ts:115–120`:
```ts
let eWasteLicensed = existing.e_waste_licensed;
// SPEC 00 §2.5: the e_waste_licensed capability is granted only by an admin
// at verification, and only when a DoE license document is on file.
if (status === 'VERIFIED' && (doeLicenseDoc || existing.doe_license_doc) && !eWasteLicensed) {
  eWasteLicensed = true;
}
```

**Gaps in the invariant:**
- **No DB CHECK** — `e_waste_licensed` is a plain boolean; any future insert path or direct DB write could set `true` with a null doc. The seed itself writes a VERIFIED+e-waste partner directly (:30–37), showing the DB accepts it.
- **Auto-grant with no admin judgment.** Approval grants `e_waste_licensed` to *any* verified partner that has *any* non-null string in `doe_license_doc` — even a plain `COLLECTOR` who pasted an arbitrary string. There is no "admin eyeballs the license" step, no separate confirm action, and no type-based check. Spec requires an admin to verify the document before the flag (`01-identity-and-trust.md:60`).
- **One-way only.** The `!eWasteLicensed` guard means the flag can only go `false -> true`. There is no route to revoke it.
- **No object storage.** `doe_license_doc` is a text column, not an uploaded file reference — there is no upload endpoint, no presigning, nothing to preview in the admin UI (which renders the raw string, `partners/page.tsx:195`).

### 6.5 Admin console (web, in `apps/api/app/admin`)

**`admin/layout.tsx`** (13 lines): wraps children in `<AdminConsole>` (:11–12). **No server-side auth guard** — the gate is entirely inside the client component.

**`admin/page.tsx`** (57 lines): static dashboard with three cards — rate-card (:21–30), partner queue (:32–41), drop-zones (:43–52).

**`admin/admin-console.tsx`** (297 lines) — session shell + sign-in:
- `TOKEN_KEY = 'chokro.admin.token'` in **`sessionStorage`** (:15).
- `AdminSessionContext` + `useAdminSession()` (:19–41).
- `AdminConsole` (:43–180): restores token on mount (:50–57); `status`: loading/signed-out/signed-in; `logout()` (:59–65); **`request()`** (:67–89) attaches `Authorization: Bearer` (:70), on **401** clears the session (:74–79), on **403** shows a permission banner but stays signed-in (:80–81).
- `SignIn` (:182–297): `POST /api/auth/login` (:200–204); **client-side check `role !== 'ADMIN'` -> error** (:216–219); persists token (:107, :226).

**`admin/partners/page.tsx`** (250 lines) — the verification queue UI:
- `FILTERS = ['ALL','APPLIED','VERIFIED','REJECTED']` (:6) — client-side only.
- `fetchPartners` (:43–59) -> `GET /api/admin/partners`.
- `updatePartner(partner, status)` (:66–97) -> `POST { partnerId, status }`; in-place row replacement (:83–85); success/error notices (:86–94). **`status` is only ever `'VERIFIED' | 'REJECTED'`; no reason prompt, no confirm dialog.**
- Table (:164–233): Organization, **Capabilities = `types[]` rendered as badges** (:183–187), DoE status badge (:188–192), DoE document cell (raw string or "No document submitted", :193–200), status badge, and Approve/Reject buttons **only when `status === 'APPLIED'`** (:205–223).

**RBAC reality check:** the admin *pages* render for anyone with any token in sessionStorage; real defense is the API's `requireAdmin`. A non-admin token gets 403 with a banner — correct, but the page content is still reachable.

---

## 7. Mobile auth flow (React Native + Expo)

### 7.1 `apps/mobile/App.tsx` (26 lines)

`QueryClientProvider` → `AuthProvider` → `AppShell` (:19–25), plus an `AppState` listener driving React Query `focusManager.setFocused` on non-web (:10–17).

### 7.2 `apps/mobile/src/context/AuthContext.tsx` (123 lines)

- `TOKEN_KEY = 'chokro.authToken'` (:7).
- `AuthContextValue` contract (:12–24): `session`, `token`, `user`, `restoreState`, `restoreError`, `authMode`, `setAuthMode`, `login`, `logout`, `retryRestore`, `clearAndRestart`.
- **`logout`** (:40–48): delete token → `queryClient.clear()` → session null → authMode login.
- **`restoreSession`** (:50–79): read token; none → ready/no-session. Otherwise `apiRequest('/api/auth/me', { token })` (:62) to validate. On `ApiError` 401 **or** 404 → delete token, treat as signed-out (:66–75). Other errors → `restoreError` + `restoreState='error'` (:76–77).
- `useEffect` runs restore once on mount (:81–83).
- **Global 401 hook** (:86–89): `setOnUnauthorized(() => void logout())` — any API 401 anywhere auto-logs out.
- **`login(nextSession)`** (:91–95): persist token, set session, force authMode login.
- `clearAndRestart` (:97–106): delete token, clear session, ready (used from the restore-error screen).

### 7.3 `apps/mobile/src/screens/LoginScreen.tsx` (126 lines)

- `handleLogin` (:32–52): normalize email (`trim().toLowerCase()`, :33), require both fields (:35), `POST /api/auth/login {email, password}` (:42–45), then `login(session)` (:46); errors via `getErrorMessage` → `ErrorBanner`.
- No "forgot password" affordance (reset is unimplemented server-side too).

### 7.4 `apps/mobile/src/screens/SignupScreen.tsx` (141 lines)

- `handleSignup` (:33–61): client checks — all fields required (:36), password >= 6 (:39–41), confirm match (:43–45); `POST /api/auth/signup {email, password}` (:51–54); then `login(session)`.
- Note the copy at :77: *"Public sign-up creates an individual account. Partner and admin access are verified separately."* — the only partner mention on mobile.
- **The body sends only `email` + `password`** — no `role`, no `institutionId`, no profile fields.

### 7.5 `apps/mobile/src/navigation/AppShell.tsx` (149 lines)

- `Tab = 'browse' | 'list' | 'rates' | 'wallet' | 'scan'` (:21); static 5-tab config (:23–34).
- `restoreState === 'loading'` → splash ("Restoring your secure session") (:40–52).
- `restoreState === 'error'` → error card with Retry (`retryRestore`) / "Use another account" (`clearAndRestart`) (:54–81).
- **Auth gate** (:83–89): `!session` → `LoginScreen` or `SignupScreen` based on `authMode`.
- Signed-in shell (:91–147): header (brand + `session.user.email` + logout :103–111), tab switch (:114–122), tab bar (:124–145).
- **Key finding:** the gate is *session presence only*. **`session.user.role` is never read** — ADMIN/PARTNER/INDIVIDUAL all see the same 5 tabs. There is no profile screen, no partner tab, no admin tab, and **no role-based navigation** (spec's "route-level guards on both app and API" is API-only today).

### 7.6 `apps/mobile/src/services/api.ts` (83 lines)

- **Base URL** (:4–17): `EXPO_PUBLIC_API_URL` → `Constants.expoConfig.extra.apiUrl` (app.json = `http://localhost:3000`) → default. Web-on-localhost swaps LAN IPs (`192.168.`/`10.0.`) back to `localhost:3000` (:8–13). Note: physical devices need `EXPO_PUBLIC_API_URL` (native has no LAN default).
- `onUnauthorized` registry + `setOnUnauthorized()` (:20–23).
- `ApiError` (:25–33).
- **`apiRequest<T>`** (:40–76): always `Accept: application/json` (:45); `Content-Type` only when a body exists (:46); **`Authorization: Bearer <token>` when `token` provided** (:47); tolerant JSON parse (:52–62); on `!ok` extracts server `data.error` (:64–68); **fires the global 401 handler on any 401** (:69–71) — including login failures (see G2).

### 7.7 `apps/mobile/src/services/storage.ts` (55 lines)

- `getItem`/`setItem`/`deleteItem`. **Web** → `localStorage` (:6–11, :23–29, :40–46). **Native** → **`expo-secure-store`** (`SecureStore`, guarded by `isAvailableAsync`) (:13–18, :31–36, :48–53). All errors silently swallowed.

### 7.8 `apps/mobile/src/types.ts` (31 lines)

- Re-exports listing enums from `@chokro/shared` (:1–11).
- `User { id, email, role, institutionId? }` (:13–18), `AuthSession { token, user }` (:20–23). **No `name`, no `photoUrl`, no `createdAt`** — profile management (story 2) is unmodeled client-side. (Note `/api/auth/me` returns `createdAt` — shape drift, see G8.)

### 7.9 Legacy barrels

`src/api.ts` and `src/storage.ts` are single-line re-exports of `./services/*` (back-compat entry points; nothing imports them today).

---

## 8. Tests (the SPEC-01 coverage at the API seam)

### 8.1 `apps/api/tests/test-utils.ts` (33 lines) — the harness

- `resetTestStore()` → `resetMemoryStore()` (:6–8) — clears all six in-memory arrays.
- `createTestUser(role = 'INDIVIDUAL', email = random)` (:10–21) — pushes a raw user row into `memoryStore.users` with `password_hash = hashPassword('password123')` (the fixed test password always works). Not via the signup route.
- `tokenFor(user)` (:23–25) — `signToken({ userId, email, role })`, a valid 7-day JWT.
- `authHeaders(token)` (:27–29) — `{ Authorization: 'Bearer ...', 'Content-Type': 'application/json' }`.
- `routeParams(id)` (:31–32) — Next-16 dynamic-route params helper.

**How isolation works:** with `NODE_ENV='test'`, `databaseOrTestStore` short-circuits to `memoryStore`, and the live `postgres` client is never constructed (`packages/db/src/index.ts:20–22`). Every suite calls `beforeEach(resetTestStore)`. Tests import route handlers directly and invoke them with `new Request(...)` — the "API seam" approach the spec mandates (spec:68), running under Jest's `node` environment (ts-jest, `jest.config.js`).

### 8.2 `apps/api/tests/auth.test.ts` (96 lines) — 6 tests

| # | Test | Verifies |
|---|---|---|
| 1 | "always creates an individual even when a privileged role is submitted" (:11–21) | `POST /api/auth/signup` with `role:'ADMIN'` → **201**, `user.role === 'INDIVIDUAL'`, token string. Locks the no-self-admin invariant. |
| 2 | "logs in and returns the authenticated profile" (:23–41) | full round-trip: signup → login (**200**) → `GET /api/auth/me` with token (**200**, email matches). |
| 3 | "uses the same generic error for unknown users and wrong passwords" (:43–58) | unknown-email → 401, wrong-password → 401, **response bodies deep-equal** (anti-enumeration). |
| 4 | "rejects missing and invalid bearer tokens" (:60–65) | `/api/auth/me` with no header and `Bearer invalid` → **401** both. |
| 5 | "requires JWT_SECRET in production" (:67–80) | `NODE_ENV=production` + no secret → `signToken` throws `'JWT_SECRET is required in production'`; env restored in `finally`. |
| 6 | "returns 503 instead of a memory success when the database fails outside tests" (:82–95) | `NODE_ENV=development` → signup → **503**, `memoryStore.users` still empty (proves the real-DB path, which throws `DatabaseUnavailableError` → 503). |

### 8.3 `apps/api/tests/partner.test.ts` (66 lines) — 3 tests

| # | Test | Verifies |
|---|---|---|
| 1 | "requires authentication and enforces the DoE gate on application" (:8–18) | apply with `eWasteLicensed:true` and **no** `doeLicenseDoc`: unauth → **401**; authed → **400** (apply-time gate). |
| 2 | "requires admin and grants the e-waste capability only at verification with a DoE document" (:20–48) | apply with a doc → `e_waste_licensed === false` at apply; verify: unauth **401**, non-admin (INDIVIDUAL) **403**, admin **200**; queue shows `status: 'VERIFIED'` **and** `e_waste_licensed === true`. |
| 3 | "never grants the e-waste capability without a DoE document on file" (:50–65) | apply with no doc + admin verify → 200 but `e_waste_licensed === false`. |

### 8.4 `apps/api/tests/sprint1-walking-skeleton.test.ts` (71 lines)

- Happy-path seam across the whole sprint-1 skeleton: admin rate card → user listing → **partner apply (with DoE doc)** → **admin verify** → public feed → drop zone → wallet adjust; asserts the status-code sequence `[201,201,201,200,200,201,201,200]` and balance invariants.
- Auth-relevant: partner application + verification are exercised end-to-end with `authHeaders`/`tokenFor`; note `GET /api/feed` is deliberately **public** (no `requireAuth`).

---

## 9. Requirements coverage matrix (SPEC 01 stories vs. code + tests)

Legend: ✅ implemented & tested · ⚠️ partial · ❌ missing

| Story | Status | Where / note |
|---|---|---|
| 1 Signup email+password | ✅ | `signup/route.ts`; auth.test 1, 2 |
| 2 Manage profile (name, photo) | ❌ | no profile columns/route/UI |
| 3 Link account to institution | ❌ | `institution_id` is a bare string; no invite-code validation; signup screen never sends it |
| 4 Delete account / PII purge | ❌ | no delete route, no `deleted_at` |
| 5 Admin sees all users | ❌ | no `/api/admin/users` |
| 6 Admin suspends user | ❌ | no `users.status`; JWT not revocable (G1) |
| 7 RBAC (3 roles) | ✅ API / ❌ app | API: `requireAuth`/`requireAdmin` + tests; **mobile AppShell never reads `role`** |
| 8 One account for giving & buying | ✅ | single-role model; no separate buyer account |
| 9 Partner org apply | ⚠️ | API works (`apply/route.ts`, tested); **no mobile UI**; no `service_areas` |
| 10 DoE license → e_waste flag | ⚠️ | gate enforced at 2 API layers + tests; **no object-storage upload, no admin eyeball step** (auto-grant) |
| 11 Admin verification queue (approve/reject **with reason**) | ⚠️ | queue works + tested; **reason missing** (schema/DTO/route/UI all lack it) |
| 12 Capability flags (5) | ❌ | only `e_waste_licensed` exists |
| 13 Verified badge + capabilities visible | ❌ | no public partner endpoint; no partner UI in mobile |
| 14 Partner suspend/reinstate | ❌ | no `SUSPENDED` state/route |
| 15 User pickup area | ❌ | not modeled |
| 16 Partner service areas | ❌ | no column/DTO/route/UI |
| 17–20 Notifications | ❌ | Sprint 2 (TA3); no `Notification` table |
| 21–25 Reports, disputes, moderation | ❌ | Sprint 3 (TA4); no `Dispute`/report entities |

**Also verified by tests:** anti-enumeration login (auth.test 3), no-self-admin (auth.test 1), DoE gate both directions (partner.test 1–3), 401/403 distinctions, production `JWT_SECRET` guard, DB-unavailable → 503.

---

## 10. Gotchas, bugs & TODOs (ranked)

**Correctness / security**
- **G1 (critical) — stateless JWT, no suspension/revocation.** `requireAuth`/`requireAdmin` (`lib/auth.ts:51–66`) trust the token; no DB re-read per request. Suspension (story 6) and role demotion won't take effect until the 7-day token expires. Fix: add `users.status`; re-read the user in `requireAuth` (like `/me` does) and return 403 for suspended.
- **G2 — global 401 handler fires on login failures.** `apiRequest` calls `onUnauthorized()` on **any** 401 (`services/api.ts:69–71`), including wrong-password login. Harmless at the login screen but semantically wrong; distinguish "bad credentials" from "expired token".
- **G3 — `SignupSchema.role` advertises ADMIN.** The route ignores it (`signup/route.ts:23`) and a test locks behavior, but the shared contract is a footgun. Remove `role` from `SignupSchema` or restrict it.
- **G4 — DoE gate has no DB CHECK and no admin judgment.** `e_waste_licensed` auto-grants on any verified partner with any string in `doe_license_doc`; one-way only (`partners.ts:118–120`). Add a DB CHECK and a separate "license confirmed by admin" step (record `verified_by`/`verified_at`).
- **G5 — signup user-enumeration.** 400 (existing email) vs 201 (new) is probeable; login is enumeration-safe but signup leaks existence.
- **G6 — no rate limiting / lockout** on login/signup; bcrypt cost 10 is sync (`hashSync`) — blocks the event loop; prefer async `hash`/`compare`.
- **G7 — malformed JSON → 500.** `req.json()` throws inside `safeRoute`; should map to 400.

**Schema / model**
- **G8 — shape drift + missing profile fields.** `/api/auth/me` returns `createdAt`, mobile `User` doesn't; no `name`/`photo`.
- **G9 — partner `types[]` free-form** (no `PartnerTypeEnum`, no DB CHECK) — a typo creates a partner routing can never match; the UI displays `types` as if they were capability flags.
- **G10 — no `service_areas`, no 4 capability flags, no `UNDER_REVIEW`/`SUSPENDED`, no reject-reason, no verify-audit columns.**
- **G11 — 1:1 user↔partner** FK contradicts "one or more user logins"; no role promotion to PARTNER exists.
- **G12 — no initial migration / journal.** Schema applied via `db:push`; only the credit-txn trigger has a SQL file. Seed re-run can silently overwrite a real user's role (`seed.ts:12–14`).

**Operational**
- **G13 — CORS `*`** with bearer tokens (`http.ts:5`, `middleware.ts:18`) is consistent but should be allowlisted before launch.
- **G14 — dev JWT secret** hardcoded (`auth.ts:6`); prod path throws — just never ship the fallback.
- **G15 — mobile base URL** defaults to `http://localhost:3000`; physical devices need `EXPO_PUBLIC_API_URL` (web-only LAN override).
- **G16 — no mobile tests** (no component tests for login/signup/AuthContext); spec allows a small set.
- **G17 — admin pages are client-gated only** (`admin-console.tsx:216`); server `requireAdmin` is the real guard — keep it that way.
- **G18 — no email normalization** — `Email@X.com` vs `email@x.com` create two accounts.

---

## 11. Suggested next steps for Member A (Sprint-1 TA1/TA2 closure)

1. **TA1:** add `users.status` (`ACTIVE`/`SUSPENDED`) + `suspended_at/by/reason`; re-read user in `requireAuth` and block suspended accounts (fixes story 6 + G1); add admin user-list + suspend/reinstate routes (stories 5, 6); add profile update + account-delete routes (stories 2, 4); remove `role` from `SignupSchema` (G3).
2. **TA2:** add `PartnerTypeEnum` + `service_areas` (jsonb) + remaining 4 capability flags (G9/G10); add `verified_by`, `verified_at`, `rejection_reason` columns and wire a reason prompt into `admin/partners/page.tsx` (story 11, "record who/when"); add `SUSPENDED`/`UNDER_REVIEW` states (story 14); add a DB CHECK for the DoE invariant (G4); add an applicant-facing "my application status" endpoint using the existing `findByOwnerId`.
3. **Mobile:** add a partner-application screen and a profile screen; branch `AppShell` on `role` once partner/admin surfaces exist.
4. **Housekeeping:** async bcrypt, 400-on-malformed-JSON, rate limiting, email normalization, allowlist CORS, mobile base-URL docs.
5. **Sprint 2 (TA3):** the `Notification` table + push-token storage on `users` — the schema has no home for them yet.
