# Design Spec: Chokro Sprint 1 (Walking Skeleton Demo)

**Date:** 2026-08-06  
**Status:** Approved (Revised: Drizzle ORM + Mobile-First Focus)  
**Target:** Sprint 1 Demo — Chokro Circular Economy Platform  
**Orchestration:** Herdr + AGY Subagents with `Gemini 3.6 Flash · high`

---

## 1. Overview & Goal

Sprint 1 delivers the **Walking Skeleton** for Chokro:
- **Mobile App (Expo React Native)**: Android/iOS primary surface for Givers, Buyers, and Partners (Sign up/login, create listing, browse feed, scan QR).
- **Backend API (Next.js)**: REST API powered by **Drizzle ORM** + PostgreSQL.
- **Admin Console (Next.js Web)**: Rate Card management console, Partner verification queue, and Drop-Zone printable poster generator.
- **Append-only Ledger**: Wallet transaction log (`CreditTxn`) maintaining derived balance invariants.

---

## 2. Monorepo Architecture

```
chokro/
├── apps/
│   ├── mobile/          # Expo React Native App (Android/iOS: Auth, Listing CRUD, Browse Feed, QR Scanner)
│   ├── api/             # Next.js App Router API & Admin Web Console (REST API, Admin Queue, Rate Card UI)
├── packages/
│   ├── db/              # Drizzle ORM schema (`schema.ts`), PostgreSQL migrations, seed script
│   └── shared/          # Shared TypeScript types, Zod validators, domain constants
├── docs/
│   ├── PRD.md
│   ├── sprint-plan.md
│   └── specs/
├── turbo.json           # Turborepo task pipeline
└── package.json         # Workspace root configuration
```

---

## 3. Technology Stack

- **Mobile App**: Expo React Native (TypeScript, Expo Camera, Expo BarCodeScanner/Camera, AsyncStore)
- **Backend API**: Next.js API Routes (REST)
- **Database & ORM**: PostgreSQL + **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`, `postgres` / `pg`)
- **Admin Console**: Next.js App Router + Tailwind CSS
- **Testing**: Jest / Vitest + API test harness (`T0`)

---

## 4. Drizzle ORM Schema (`packages/db/src/schema.ts`)

- `users`: `id` (uuid), `email`, `password_hash`, `role` (`INDIVIDUAL` | `PARTNER` | `ADMIN`), `institution_id`, `created_at`
- `partners`: `id` (uuid), `user_id`, `org_name`, `types` (jsonb), `e_waste_licensed` (boolean), `status` (`APPLIED` | `VERIFIED` | `REJECTED`), `doe_license_doc`
- `listings`: `id` (uuid), `owner_id`, `category` (9 categories enum/text), `unit` (`kg` | `piece`), `declared_weight`, `declared_condition`, `photos` (jsonb), `status` (`DRAFT` | `ACTIVE` | `CANCELLED`)
- `rate_card_entries`: `id` (uuid), `category`, `condition_band`, `unit`, `price_bdt`, `effective_from` (timestamp), `updated_by`
- `drop_zones`: `id` (uuid), `institution_id`, `name`, `geo_location` (jsonb), `qr_token`, `accepted_categories` (jsonb), `status`
- `credit_txns`: `id` (uuid), `user_id`, `amount`, `kind` (`EARN` | `REDEEM` | `ADJUST`), `status` (`PENDING` | `VERIFIED` | `REJECTED`), `source_id`, `created_at`

---

## 5. Member Attribution & Work Breakdown

Git commits will be authored/attributed per team member (`--author` flag):

| Member | Focus | Ticket(s) | Commit Author |
|---|---|---|---|
| **Member A** | Identity, Trust & Partners | `TA1` (Auth/RBAC API & Mobile Screen), `TA2` (Partner Application & Admin Verification) | `Member A <member.a@chokro.org>` |
| **Member B** | Circular Marketplace | `TB1` (Listing CRUD API & Mobile Form), `TB2` (Browse Feed API & Mobile Feed Screen) | `Member B <member.b@chokro.org>` |
| **Member C** | Intelligence & Engagement | `T0` (Test Harness & Drizzle Setup), `TC1` (Admin Rate Card Console UI & API) | `Member C <member.c@chokro.org>` |
| **Member D** | Collections & Wallet | `TD1` (Wallet Ledger API & Mobile Wallet Screen), `TD2` (Drop-Zone Registry & QR Poster Generator) | `Member D <member.d@chokro.org>` |

---

## 6. Herdr Multi-Session Execution Topology

Subagents run in Herdr terminal panes using `agy` with Gemini 3.6 Flash (High):

1. **Phase 1 — Scaffold (T0)**:
   - Scaffold monorepo (`turbo`), set up Drizzle ORM schema & migrations, create seed script (`admin`, `demo user`, `partner`, `3 rate card entries`), build API test harness.

2. **Phase 2 — Parallel Subagents (Core Tickets)**:
   - `agy-ta1-auth`: Auth API + Expo Login/Signup screens (`TA1`)
   - `agy-tb1-listing`: Listing CRUD API + Expo Create Listing screen (`TB1`)
   - `agy-tc1-ratecard`: Next.js Admin Rate Card Console UI & API (`TC1`)
   - `agy-td1-wallet`: Wallet Ledger API + Expo Wallet screen (`TD1`)
   - `agy-td2-dropzone`: Drop-Zone CRUD API + QR poster endpoint (`TD2`)

3. **Phase 3 — Dependent Tickets**:
   - `agy-ta2-partner`: Partner application & Admin approval queue (`TA2`)
   - `agy-tb2-feed`: Mobile Browse Feed screen + Paginated Feed API (`TB2`)

4. **Phase 4 — Integration & Verification Gate**:
   - Run API test suite, Drizzle ledger invariant test (`SUM(credit_txns)`), build check, seed check.

---

## 7. Verification Criteria

- DB Seed creates Admin user, Demo user, Partner user, and 3 active Rate Card rows.
- Wallet balance equals `SUM(credit_txns)` — append-only invariant.
- Partner `e_waste_licensed` flag requires DoE license document.
- Mobile app connects to live local backend API.
- QR payload is a signed opaque token.
