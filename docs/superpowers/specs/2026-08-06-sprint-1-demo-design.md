# Design Spec: Chokro Sprint 1 (Walking Skeleton Demo)

**Date:** 2026-08-06  
**Status:** Approved  
**Target:** Sprint 1 Demo — Chokro Circular Economy Platform  
**Orchestration:** Herdr + AGY Subagents with `Gemini 3.6 Flash · high`

---

## 1. Overview & Goal

Sprint 1 delivers the **Walking Skeleton** for Chokro: an end-to-end working system where:
- The app boots against a live API + PostgreSQL database.
- Users can sign up, edit profiles, create listings (with 9 categories and dual unit pricing), and browse a feed.
- Partners can apply and admins can verify partner credentials with DoE license checks.
- Admins can manage the published Rate Card with versioning (`effective_from`).
- The append-only Wallet Ledger (`CreditTxn`) maintains invariant balances.
- QR Drop-Zones can be registered, tokenized, and printed as posters.

---

## 2. Monorepo Architecture (Option 1)

```
chokro/
├── apps/
│   ├── api/             # Next.js App Router API Routes (REST endpoints, server logic)
│   ├── admin/           # Next.js Web Admin Console (Rate Card, Partner Queue, Drop-Zones)
│   └── mobile/          # Expo React Native App (Individual/Partner UI, QR Scanner)
├── packages/
│   ├── db/              # Prisma Schema, PostgreSQL migrations, Seed scripts
│   └── shared/          # Shared TypeScript types, Zod schemas, domain constants
├── docs/
│   ├── PRD.md
│   ├── sprint-plan.md
│   └── specs/
├── turbo.json           # Turborepo build & script pipeline
└── package.json         # Workspaces root configuration
```

---

## 3. Member Attribution & Work Breakdown

Git commits will be authored/attributed per team member (`--author` or environment variables):

| Member | Focus | Ticket(s) | Commit Author |
|---|---|---|---|
| **Member A** | Identity, Trust & Partners | `TA1` (Auth/RBAC), `TA2` (Partner Verification Queue) | `Member A <member.a@chokro.org>` |
| **Member B** | Circular Marketplace | `TB1` (Listing CRUD), `TB2` (Browse Feed & Filters) | `Member B <member.b@chokro.org>` |
| **Member C** | Intelligence & Engagement | `T0` (Test Harness Lead), `TC1` (Rate Card Console) | `Member C <member.c@chokro.org>` |
| **Member D** | Collections, E-Waste & Wallet | `TD1` (Wallet Ledger), `TD2` (Drop-Zone Registry & QR) | `Member D <member.d@chokro.org>` |

---

## 4. Prisma Schema & Domain Models

The core schema in `packages/db/prisma/schema.prisma` includes:

- `User`: `id`, `email`, `password_hash`, `role` (`INDIVIDUAL` | `PARTNER` | `ADMIN`), `institution_id`, `created_at`
- `Partner`: `id`, `user_id`, `org_name`, `types`, `e_waste_licensed`, `status` (`APPLIED` | `VERIFIED` | `REJECTED`), `doe_license_doc`
- `Listing`: `id`, `owner_id`, `category` (9 categories), `unit` (`kg` | `piece`), `declared_weight`, `declared_condition`, `photos`, `status` (`DRAFT` | `ACTIVE` | `CANCELLED`)
- `RateCardEntry`: `id`, `category`, `condition_band`, `unit`, `price_bdt`, `effective_from`, `updated_by`
- `DropZone`: `id`, `institution_id`, `name`, `geo_location`, `qr_token`, `accepted_categories`, `status`
- `CreditTxn`: `id`, `user_id`, `amount`, `kind` (`EARN` | `REDEEM` | `ADJUST`), `status` (`PENDING` | `VERIFIED` | `REJECTED`), `source_id`, `created_at`

---

## 5. Herdr Multi-Session Execution Topology

Subagents run in Herdr terminal panes using `agy` with Gemini 3.6 Flash (High):

1. **Phase 1 — Scaffold (T0)**:
   - Create monorepo (`turbo`, `pnpm`/`npm`), configure Prisma DB connection, create seed script, setup API test harness.

2. **Phase 2 — Core Ticket Execution (Parallel Subagents)**:
   - `agy-ta1-auth`: Implement email auth, JWT, RBAC guards.
   - `agy-tb1-listing`: Implement Listing CRUD APIs & mobile forms.
   - `agy-tc1-ratecard`: Implement Admin Rate Card CRUD & published view API.
   - `agy-td1-wallet`: Implement `CreditTxn` ledger API & balance derivation invariant tests.
   - `agy-td2-dropzone`: Implement DropZone CRUD & signed QR generation + poster endpoint.

3. **Phase 3 — Dependent Ticket Execution**:
   - `agy-ta2-partner`: Implement Partner onboarding & DoE license validation queue.
   - `agy-tb2-feed`: Implement Feed search API with cursor pagination.

4. **Phase 4 — Integration & Verification Gate**:
   - Run complete end-to-end tests, linting, typechecking, and seed verification.

---

## 6. Verification Criteria

- DB Seed generates 1 Admin user, 1 Demo user, 1 Partner user, and 3 active Rate Card entries.
- Non-admin accessing admin endpoints returns `HTTP 403 Forbidden`.
- Wallet balance equals `SUM(ledger entries)` — ledger is append-only.
- Partner `e_waste_licensed` flag cannot be set without a verified DoE license document.
- QR payload is a signed opaque token.
