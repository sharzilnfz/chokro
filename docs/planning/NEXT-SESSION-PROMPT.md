# Copy-paste prompt for a fresh session

---

You are working on **Chokro** (চক্র), a circular-economy / scrap-trading platform, at
`/Users/sharzilnafis/Desktop/Project/chokro`. Monorepo: pnpm 11 + Turborepo + Nx.
Next.js 16 App Router API + web admin (`apps/api`), React Native 0.86 / Expo SDK 57
(`apps/mobile`), Drizzle ORM + PostgreSQL 17 / PGlite (`packages/db`), shared Zod DTOs and
enums (`packages/shared`). Jest 30 + in-memory PGlite for tests.

## My goal

Turn this from a pile of CRUD registries into **one end-to-end product that actually works,
solves a real problem, and demos convincingly** — while scoring maximum marks under a strict
university rubric. I need a concrete, sequenced, buildable plan, then I want to build it.

## Ground truth (already verified — trust this, don't re-derive)

**Shipped and real:**
- 6 DB tables only: `users`, `partners`, `listings`, `rate_card_entries`, `drop_zones`,
  `credit_txns`. Enums are `varchar` + comments, not `pgEnum`.
- 18 route handlers under `apps/api/app/api/**/route.ts`: auth (signup/login/me), feed,
  listings, partners/apply, rate-card (published/estimate), drop-zones (+resolve, +poster),
  wallet (balance/transactions), admin (partners, rate-card, wallet/adjust), health.
- 5 domain modules in `apps/api/lib/domain/`: `AuthDomain`, `ListingDomain`, `PartnerDomain`,
  `WalletDomain`, `KeysetPagination`. Repos in `apps/api/lib/repos/` behind a `withDb()` seam.
- 7 mobile screens: Login, Signup, Feed, CreateListing, RateCard, Wallet, QRScanner.
- 13 Jest suites in `apps/api/tests/`.
- Patterns: routes wrapped in `safeRoute` (`apps/api/lib/http.ts`), Next 16 route params are
  `Promise` (must `await params`), all Drizzle calls inside `withDb`, HMAC-SHA256 signed
  drop-zone QR tokens in `apps/api/lib/qr.ts`.

**Confirmed gaps:**
- **Zero external API integrations.** No third-party SDK in any `package.json`; no outbound
  HTTP to any external host anywhere in `apps/` or `packages/`.
- **The core loop does not close.** Nothing writes `credit_txns` except admin adjust. QR scan
  only *recognises* a drop zone — no deposit is recorded. Wallet is always empty. There is no
  deposit, pickup, order, or verification entity of any kind.
- Mobile is individual-user only. No PARTNER or ADMIN mobile surface. Admin is web-only.
- No `.env.example` in `apps/api`.
- Mobile deps include `expo-camera`, `expo-image-picker`, `expo-image-manipulator`. No maps,
  no push notifications, no realtime/websocket client.

**Do NOT trust these files — they are stale, aspirational, or wrong.** Read them only to
mine ideas, never as a spec, and tell me when they contradict the code:
`docs/planning/sprint-plan.md`, `docs/planning/progress.md`, `docs/product/PRD.md`,
`docs/product/SRS_Functional_Requirements.md`, `docs/specs/*`, `docs/architecture/*`.
The **code is the only source of truth**. `AGENT_GUIDE.md` and `CONTEXT.md` are broadly
accurate on architecture but describe intent, not completeness.

## Hard constraints (university rubric — non-negotiable)

Course CSE471. Team of 4: `m1` Sadat, `m2` Sameer, `m3` **Sharzil (me)**, `m4` Imran.

1. **4 features per member**, evaluated across 3 modules:
   - Module 1 (Lab 5): feature 1 — *already submitted; can be retroactively refined and defended*
   - Module 2 (Lab 6): feature 2
   - Module 3 (Lab 7): features 3 and 4
2. **5 marks per feature** (20 total per member):
   Frontend (1) + Backend/API (1) + Database (1) + Innovation (1) + **Integration / External API (1)**
3. **Banned as standalone features** (infrastructure only, worth zero as a feature):
   login/signup/SSO/OAuth/logout · role management / RBAC · profile management ·
   generic admin activities or config · monorepo setup, CI/CD, boilerplate
4. **Mandatory:** real DB with authentic CRUD (hardcoded data = 0 marks) · at least one
   external API integration per member · **CO5 live-modification viva** — I must be able to
   change frontend, backend, *and* DB schema live during evaluation
5. **Assignment 03 (nearest deadline):** 2 features' REST APIs documented in Postman.
   Server on a custom port = last 4 digits of my student ID. Must show URL, method, headers,
   body/params, DB connection, and Postman test screenshots.

Full text: `docs/product/course-guideline.md`. Read it.

## My locked feature roadmap (m3 / Sharzil)

- **F1 (Module 1, done):** Scrap Rate-Card Console & Benchmark Valuation Engine — `rate_card_entries`
- **F2 (Module 2):** **AI Next-Life Scrap Vision Agent** — photo → vision model identifies
  material + condition + estimated weight → queries rate card → instant cash quote +
  reuse/recycle advice. External API: OpenAI vision (`gpt-4o-mini` class).
- **F3 (Module 3):** **Smart Geo-Dispatch & Route Optimizer** — collector dispatch with vehicle
  capacity constraints and shortest-path routing. External API: Mapbox or Google Distance Matrix.
- **F4 (Module 3):** **B2B Bulk Scrap Auction & Live Bidding** — industrial lots, realtime bid
  countdown. External API: Pusher or equivalent websocket service.

Teammates will pick their own features; I mainly need my 4 plus whatever **shared spine** the
whole team depends on. Don't design their features in detail unless I ask.

## Problems I already know about — address them, don't rediscover them

1. **All four Module-1 features are capped at 4/5** because none has an external API. Module 1
   is explicitly re-defendable, so each member needs a *minimal, honest* external-API retrofit.
2. **Three of four Module-1 features sit on the banned list**: Sadat's partner verification reads
   as RBAC + admin activity; **my rate-card console reads as "generic admin config"**; Imran's
   drop-zone management reads as admin CRUD. Each needs reframing around its non-admin,
   user-facing surface plus a defensible innovation claim. For mine, the *public estimator*
   endpoint and versioned effective-dated pricing are the feature — not the admin table.
3. **No closed loop = no demo.** Material never moves and credits never verify.
4. **Route path mismatch:** Assignment 03 specifies `/api/v1/rate-card/estimate` but the code
   serves `/api/rate-card/estimate`. No `v1` namespace exists. The AI classify endpoint doesn't
   exist. The custom port isn't configured. Resolve all three.
5. **Rubric ambiguity to flag, not silently resolve:** rule 2 implies an external API *per
   feature*; rule 4 says at least one *per member*. Plan for per-feature (the safer reading)
   but call out the assumption so I can confirm with the instructor.

## What I want from you, in this order

**Phase 1 — Verify (be fast, use subagents in parallel).**
Confirm the ground truth above against the actual code and correct me where I'm wrong. Check
what `apps/api/tests/` really covers, whether `pnpm typecheck` and `pnpm test` pass right now,
and whether the mobile app actually builds. Report pass/fail with real output — do not assume.

**Phase 2 — Design the spine.**
The smallest set of new tables, domain modules, and state transitions that makes the loop close:
material gets deposited or picked up → evidence captured → verified → `credit_txns` flips
PENDING to VERIFIED → balance becomes real → user can redeem. This spine is shared
infrastructure every member's features hang off, so it must not be owned by any one member's
feature. Respect the existing invariants: append-only ledger (never mutate balances; derive
them), unit invariant (`APPLIANCES`/`E_WASTE` → piece + `pieceCount`; all others → kg +
`declaredWeight`), thin `safeRoute` handlers with logic in `lib/domain/`, DB access via `withDb`.

**Phase 3 — Map features to the rubric.**
For each of my 4 features, a table: what the user sees (frontend), the endpoints (backend), the
tables and migrations (DB), the *specific* defensible innovation claim, and the exact external
API with the env var it needs. Explicitly state how each dodges the banned list. Flag any
feature you think will not survive a skeptical examiner, and say why.

**Phase 4 — Sequence the work.**
A dependency-ordered build plan with checkpoints, split into: (a) unblock Assignment 03 now,
(b) Module 2 / Lab 6, (c) Module 3 / Lab 7. Each step needs a concrete verification command or
test that proves it works. Call out what needs API keys or paid accounts, and give me a
degraded-mode fallback for every external API so a dead key or missing network can never break
a live demo or viva.

**Phase 5 — Make it demoable.**
A seed dataset that leaves no screen empty, plus a timed demo script that walks one coherent
story end to end. Identify what's missing for the story to land — I currently have no partner
or admin mobile surface, and a collector/recycler persona has nowhere to log in.

## How to work with me

- Use `codebase-memory-mcp` (project `Users-sharzilnafis-Desktop-Project-chokro`) for discovery
  before grep. **Scope queries to `apps/` and `packages/`** — the graph is heavily polluted by
  `.agents/skills` helper scripts, ignore them entirely.
- Use subagents for parallel investigation. Don't serialise independent lookups.
- Surgical diffs. No speculative abstractions. Match existing style.
- Be blunt about feasibility. If a feature is too ambitious for the timeline, or the rubric
  reading is a stretch, say so plainly instead of agreeing with me. Distinguish verified fact
  from judgment call.
- Ask before writing code. **This phase is planning: end with a written plan and the single next
  action, not an implementation.**

Start with Phase 1.
