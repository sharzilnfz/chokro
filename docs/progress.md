# Chokro — Project Task & Progress Tracker

> **Purpose:** Single source of truth for where every ticket stands across the project.
> **Source plan:** `docs/sprint-plan.md` (tickets TA1–TD8, T0, T1) · requirements in `docs/PRD.md` + `docs/specs/00–04`.
> **Status legend:** `[x]` done/verified · `[~]` in progress / partial · `[ ]` not started · `[be]` blocked.
> **Last updated:** 2026-08-06 (Sprint 1 code complete, uncommitted).

---

## Sprint 1 — Walking Skeleton (weeks 1–2)

**Goal:** app boots against a real API + DB; sign up → create listing → view in feed; admin sets rates and prints a zone poster; wallet ledger exists.

| Ticket | What it delivers | Status |
|---|---|---|
| **T0** | Monorepo scaffold: Expo + Next.js API + Postgres/Drizzle + CI (typecheck, lint, test), seed data, API test harness, dev deploy. Ratified OD-1/OD-2. | [x] |
| **TA1** | Email signup/login, RBAC guards (individual/partner/admin), profile edit, institution link by invite code. | [~] |
| **TA2** | Partner application → admin verification queue → approve/reject with reason; capability flags; DoE-license gate on `e_waste_licensed`. | [x] |
| **TB1** | Listing CRUD: 9 categories, dual-unit (kg vs per-piece), photos (client downscale ≤1600px), draft/active/cancelled. | [x] |
| **TB2** | Browse feed (cursor-paginated) + filters (category, area, condition) + listing detail. | [x] |
| **TC1** | Rate-card admin console: CRUD, dual-unit pricing, versioning (`effective_from`), in-app published view. | [x] |
| **TD1** | Wallet + append-only ledger: CreditTxn schema, derived pending/verified balances, history view, admin adjust-with-reason. | [x] |
| **TD2** | Drop-zone registry: CRUD, signed QR tokens, print-ready poster generation. | [x] |

### Sprint 1 — Task breakdown

**T0 — Scaffold & harness** `[x]`
- [x] pnpm 11 workspace + Turborepo monorepo (`apps/api`, `apps/mobile`, `packages/db`, `packages/shared`)
- [x] Next.js API + Expo mobile + Postgres(docker compose) + Drizzle ORM
- [x] CI-equivalent scripts: typecheck, lint, test, build (24 routes built green)
- [x] Seed data: admin, demo user, pre-verified partner + 3 rate rows
- [x] API test harness (Jest, `NODE_ENV=test` in-memory fallback `databaseOrTestStore`)
- [x] OD-1 (email+password) and OD-2 (Next + Postgres + Drizzle) ratified

**TA1 — Identity & auth**
- [x] Email signup (public signup always creates `INDIVIDUAL`) + login (bcrypt)
- [x] `requireAuth` / `requireAdmin` guards; `x-user-id` bypass removed
- [x] `/api/auth/me`
- [ ] Password reset email flow (plan acceptance: "password reset email flow works")
- [ ] Profile edit endpoint / UI
- [ ] Institution linkage via invite code
- [ ] Suspended-user check on list/redeem/deposit (`auth/me` does not consult current user status yet)

**TA2 — Partners** `[x]`
- [x] Partner application (org, types, service areas, documents)
- [x] DoE-license gate: `e_waste_licensed` force-`false` at apply; admin grants only when DoE doc on file
- [x] Admin verification queue: approve/reject with reason (`e_waste_licensed` granted at approve)
- [ ] Rejected partner receives reason (rejection messaging)

**TB1 — Listings**
- [x] Create listing: 9 categories, dual-unit (per-kg / per-piece), photo downscale ≤1600px
- [x] Piece-conditional: APPLIANCES/E_WASTE → piece + pieceCount; others → kg + declaredWeight
- [x] Publish/draft/active/cancelled lifecycle
- [x] `[id]` GET = owner-or-admin; GET list = owner-scoped (auth hardening added during review)
- [ ] Listing photo server-side EXIF/GPS strip (deferred — hosted image ingestion not wired)

**TB2 — Browse feed**
- [x] Cursor-paginated feed with "Load more" + pull-to-refresh
- [x] Filters: category + condition chips
- [x] Listing detail

**TC1 — Rate card**
- [x] Admin console publish rate (category, condition band, price)
- [x] Unit derived server-side in admin POST (APPLIANCES/E_WASTE→piece, else kg)
- [x] Versioning: published endpoint returns latest `effective_from <= now`; supersession logic + tests
- [x] In-app published view (mobile Rates tab)
- [ ] Weekly review cadence / admin rate sanity vs BanglaBin (onboarding task)

**TD1 — Wallet & ledger**
- [x] CreditTxn schema; append-only ledger (DB trigger rejects update/delete)
- [x] Derived pending/verified balances (`balance == SUM(ledger)` invariant test)
- [x] Wallet history view (mobile) + icon sign canonicalization (amount = source of truth)
- [x] Admin adjust-with-reason (`[id]` verify/adjust), `ADMIN` role-gated
- [ ] Admin wallet web page (adjust is API-only for now)

**TD2 — Drop zones**
- [x] Zones CRUD (`/api/drop-zones`), categories
- [x] Signed opaque QR token (HMAC; tampered → 400)
- [x] Print-ready poster generation (`/api/drop-zones/[id]/poster`) — "Print poster" with QR
- [x] Mobile Scan tab resolves token → "REGISTERED DROP ZONE" card (recognition only, Sprint 1 boundary)
- [x] Resolve endpoint auth (`/api/drop-zones/resolve`)
- [x] Admin Drop Zones page (+ `categories.ts`) added post-review
- [ ] Admin zone/Wallet list page (deferred)

**Mobile app (Sprint 1 surface)**
- [x] Login / Signup screens
- [x] Feed / Browse screen with filters + pagination
- [x] Create Listing screen (kg vs piece units)
- [x] Wallet screen (pending/verified, ledger rows)
- [x] Rates tab (5th tab added)
- [x] Drop-zone Scan tab (QR recognition)
- [x] SecureStore session restore

**Deferred / open (not Sprint 1 blockers)**
- [ ] Android build/export script (`expo export` not added)
- [ ] Admin Drop Zone/Wallet list page

### Sprint 1 acceptance criteria — status
- [x] T0: CI green; one passing API test; seed creates admin + demo user + 3 rate rows
- [x] TA1: non-admin hitting admin route → 403 (partial — reset/suspension pending)
- [ ] TA2: rejected partner receives reason; admin cannot set `e_waste_licensed` without DoE doc (gate done)
- [x] TB1/TB2: create → publish → appears in feed; e-waste requires per-piece fields
- [x] TC1: editing rate supersedes old row; UI/agent reads only effective rows
- [x] TD1: `balance == SUM(ledger)` invariant; ledger rejects update/delete at DB layer
- [x] TD2: QR payload signed opaque token; poster renders zone name + QR

---

## Sprint 2 — Core Loops (weeks 3–4)

**Goal:** photo → agent recommendation → listing, and scan zone QR → deposit → pending credits.

| Ticket | What it delivers | Status |
|---|---|---|
| **TA3** | Notifications v1: in-app list, Expo push, event kinds w/ deep links; pickup-area setup (F4). | [ ] |
| **TB3** | Five-path selection (agent rec default), path-based counterparty visibility, downstream destinations (A6). | [ ] |
| **TB4** | Buy-now / collection-request → seller accept/decline → listing `matched` → pickup task auto-created. | [ ] |
| **TC2** | Next-Life Agent v1: photos → vision → category + condition + value range + path + ≤60-word rationale; confirm/override; manual fallback. Ratify OD-4. | [ ] |
| **TD3** | Deposit flow: scan zone QR → category → camera-only photo → `pending` deposit; zone validation at scan. | [ ] |
| **TD4** | Pickup tasks: auto-create (TB4/zone-empty), admin assignment, partner list, two-sided handshake. | [ ] |

### Sprint 2 checklist
- [ ] TA3 in-app notification list + push registration + event kinds (F4 pickup-area setup)
- [ ] TB3 five-path selector (reuse/donate/repair/resell/recycle), counter !== visible, downstream named destinations
- [ ] TB4 buy-now/collection-request state machine (request → matched → pickup task)
- [ ] TC2 vision provider integration (Gemini Flash / GPT-4o-mini class — ratify OD-4); golden-set fixtures; manual fallback
- [ ] TC2 e-waste detection forces recycle + human escalation, cannot be overridden
- [ ] TD3 deposit: camera-only evidence, kg vs per-piece category, `pending` credit immediately
- [ ] TD4 pickup-task CRUD + two-sided QR/OTP handshake
- [ ] OD-3 (Bangla labels) / OD-4 ratification

---

## Sprint 3 — Verification & Money (weeks 5–6)

**Goal:** Trust Gate live with auto-clear + escalation; credits verify and redeem (mock); e-waste legally routed; offers + scheduling.

| Ticket | What it delivers | Status |
|---|---|---|
| **TA4** | Report/dispute + moderation: report, dispute (freeze credits), admin resolve (immutable note), hide/restore/remove. | [ ] |
| **TB5** | Offer flow for recyclables: single binding offer, 48h TTL, accept/decline/auto-expire, one round/listing. | [ ] |
| **TB6** | Pickup scheduling + status timeline + transition notifications. | [ ] |
| **TC3** | Agent hardening: monthly spend guard, confidence thresholds, golden-set accuracy CI artifact, rationale quality. | [ ] |
| **TC4** | Impact dashboard v1: verified outcomes → weights, credits, CO₂e (factor table), "estimated" wording. | [ ] |
| **TD5** | **Trust Gate engine:** A4 signal stack perfect decision fn; auto-clear/escalate; decision records; verified weight at emptying; escalation queue. | [ ] |
| **TD6** | Redemption: guards (min ৳300, verified-only, monthly cap ৳50k), signals, mock payout `MOCK-BKASH-<uuid>` + fee note. Ratify OD-5/OD-6. | [ ] |
| **TD7** | E-waste verified workflow: licensed-partner-only routing, always-escalate, handover record. | [ ] |

---

## Sprint 4 — Engagement & Hardening (weeks 7–8)

**Goal:** retention loop (impact, leaderboards, badges, campaigns); ratings + completion; privacy hardened; pilot dry-run.

| Ticket | What it delivers | Status |
|---|---|---|
| **TA5** | Privacy & account: EXIF-strip test, deletion PII purge (≤30d), notification depth, Bangla labels (ratify OD-3). | [ ] |
| **TB7** | Completion + two-sided ratings; search v2; listing expiry TTL job. | [ ] |
| **TC5** | Leaderboards (individual + institution; windows; opt-out) + badges/milestones + admin campaigns w/ multipliers on CreditTxn. | [ ] |
| **TC6** | Impact dashboard v2: downstream destinations, shareable summary, campaign history. | [ ] |
| **TD8** | Trust Gate tuning: config UI, audit ergonomics, redemption polish, 100-concurrent-deposit load spot-check. | [ ] |
| **T1** (ALL) | End-to-end V&V + pilot dry-run: golden-path E2E per role, fraud fixture suite, demo script, pilot checklist. | [ ] |

---

## Cross-cutting / platform TODOs
- [ ] Commit current Sprint 1 worktree (all changes uncommitted)
- [ ] React 19.2.3 mobile alignment & `react-dom` pinned via `pnpm-workspace.yaml` overrides
- [ ] EXIF/GPS strip on photo upload + ≤90-day evidence retention (A9)
- [ ] Android build/CI + `EXPO_PUBLIC_API_URL` device LAN config
- [ ] Trust Gate rule-table test suite (highest-value tests — starts Sprint 3)
- [ ] ≥80% coverage on Trust Gate + wallet modules (T1 gate)

---

## Document map (for context)
| File | Role |
|---|---|
| `docs/PRD.md` | Product truth (what & why) |
| `docs/specs/00–04` | Engineering constraints + detailed requirements |
| `docs/sprint-plan.md` | Tickets TA1–TD8, M1–M4, V&V gates, 25-feature traceability |
| `docs/manual-testing.md` | Manual test guide (backend + web admin + mobile) |

*Open decisions:* OD-1 Ratified · OD-2 Ratified (2026-08-06) · OD-3 pending (Sprint 2) · OD-4 pending (Sprint 2) · OD-5 pending (Sprint 3) · OD-6 pending (Sprint 3)