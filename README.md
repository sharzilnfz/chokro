# Chokro

Chokro is a circular economy and smart recycling platform for Bangladesh. It connects individuals, verified recycling partners, and campus institutions through recyclable listings, live auctions and negotiations, QR-authenticated drop zones, pickup dispatch with OTP custody handovers, and an append-only Green Wallet credit ledger — from first listing all the way to verified impact certificates.

## Features

- **Listings & marketplace** — post recyclable or reusable materials with condition bands, media uploads, saved listings, a public feed, and buyer demand matching.
- **Negotiations & auctions** — threaded offers with accept/reject, plus live auction lots with realtime bids (Pusher, with polling fallback).
- **AI-assisted valuation** — photo-based item classification and price estimation via Gemini/OpenAI, with a built-in heuristic fallback; published rate cards per category and condition band.
- **Drop zones** — QR-token authenticated physical collection points with telemetry, capacity logs, emptying records, and deposit sessions.
- **Pickups & custody** — collector route dispatch, geo-based routing, OTP-verified handovers, escrow holds, and release.
- **Trust gate** — verification checks that convert pending credits to verified balance, with contests, admin adjudication, thresholds, and fraud flags.
- **Green Wallet** — append-only credit ledger (`credit_txn`), pending vs. verified balances, redemptions, payouts.
- **Gamification & impact** — streaks, badges (with OG share images), leaderboards, personal and institution impact dashboards, and verifiable sustainability certificates.
- **Partner onboarding** — partner applications, KYC extraction with an admin adjudication queue, compliance audits, and a partner console.
- **Admin console** — web dashboard for campuses, rate cards, drop zones, KYC queue, trust-gate escalations, redemptions, disputes, and liability caps.
- **Email notifications** — cron-scheduled digest worker (JSON, SMTP, or Ethereal transport).

## Architecture

A pnpm monorepo (`apps/*`, `packages/*`) orchestrated by Turborepo (dev) and Nx (build/test/lint):

| Workspace | Package | Description |
|---|---|---|
| `apps/api` | `@chokro/api` | Next.js App Router server — REST API (~100 route handlers under `/api` and `/api/v1`), admin console, public browse pages, badge OG images. Standalone output for Docker. |
| `apps/mobile` | `@chokro/mobile` | Expo (React Native) app for iOS, Android, and web with role-based navigation for Individual, Collector, Recycler, Partner, and Admin personas. |
| `packages/db` | `@chokro/db` | Drizzle ORM schema (47 tables), migrations, and seed data for PostgreSQL. Tests run against in-memory PGlite — no database required. |
| `packages/shared` | `@chokro/shared` | Zod DTOs and enums shared by API and mobile. |

The API follows a layered structure: route handler → domain module (`lib/domain`, pure business rules — ESLint-enforced isolation from the DB) → repository layer (`lib/repos`) → Drizzle/PostgreSQL.

### Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict), Node.js ≥ 22.13 |
| API framework | Next.js 16 (App Router, Route Handlers) |
| Mobile | Expo SDK 57 · React Native 0.86 · NativeWind 4 |
| Database | PostgreSQL 17 · Drizzle ORM · PGlite (tests) |
| Validation | Zod 4 shared DTOs |
| Auth | JWT bearer tokens + bcrypt; tokens stored in device secure storage |
| Realtime | Pusher Channels (polling fallback) |
| Email | Nodemailer + node-cron |
| AI vision | Gemini / OpenAI (heuristic fallback) |
| Geo/routing | Mapbox (optional) / OSRM + Haversine fallback |
| Testing | Jest 30 + ts-jest |
| Tooling | pnpm 11 · Turborepo · Nx · ESLint 9 |

## Getting started

### Prerequisites

- Node.js ≥ 22.13.0
- pnpm 11.18.0 (via Corepack: `corepack enable`)
- Docker (for the one-command setup)

### Quick start with Docker

Runs Postgres, migrates + seeds the database, starts the API, and launches the notification worker:

```bash
cp .env.example .env   # set JWT_SECRET and QR_SECRET
docker compose up --build
```

- API: http://localhost:3000 (health check at `/api/health`)
- Postgres: `localhost:5433` (user/password `postgres`, db `chokro`)

### Local development

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Set DATABASE_URL, JWT_SECRET, and QR_SECRET at minimum

# 3. Start Postgres (or point DATABASE_URL at your own instance)
docker compose up -d postgres

# 4. Migrate and seed the database
pnpm db:setup

# 5. Run everything in dev mode
pnpm dev
```

The API runs on port 3000. The Expo mobile app connects to `EXPO_PUBLIC_API_URL` (default `http://localhost:3000`).

Run the mobile app:

```bash
pnpm --filter @chokro/mobile start    # Expo dev server
pnpm --filter @chokro/mobile ios      # iOS simulator
pnpm --filter @chokro/mobile android  # Android emulator
pnpm --filter @chokro/mobile web      # Web
```

> The platform degrades gracefully without third-party keys: AI vision falls back to a heuristic classifier, geo-dispatch falls back to free OSRM routing, commodity benchmarks fall back to a calibrated baseline table, and auctions fall back to polling. The app runs fully keyless out of the box.

## Environment variables

Copy `.env.example` to `.env`. Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random secret for signing auth tokens (mandatory in production) |
| `QR_SECRET` | Secret used to sign drop-zone QR tokens |
| `EXPO_PUBLIC_API_URL` | Base URL the mobile app uses to reach the API |

Optional integrations: `GEMINI_API_KEY` or `OPENAI_API_KEY` (vision), `MAPBOX_TOKEN` (routing), `PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` / `PUSHER_CLUSTER` plus `EXPO_PUBLIC_PUSHER_KEY` / `EXPO_PUBLIC_PUSHER_CLUSTER` (realtime), `SMTP_*` with `NOTIFY_TRANSPORT` (`json` \| `smtp` \| `ethereal`), `NOTIFY_CRON`, `NOTIFY_WINDOW_HOURS`, `APP_URL`, `APP_SCHEME`.

## Scripts

All commands run from the repository root:

| Command | Description |
|---|---|
| `pnpm dev` | Run API and mobile in dev mode |
| `pnpm build` | Build all workspaces |
| `pnpm test` | Run the full test suite (PGlite-backed, no DB setup needed) |
| `pnpm test:changed` | Run only changed tests |
| `pnpm affected:test` | Run tests affected by current changes |
| `pnpm lint` | Lint all workspaces |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm db:setup` | Migrate + seed |
| `pnpm db:push` | Push Drizzle schema directly (dev only) |
| `pnpm graph` | Open the Nx project graph |
| `pnpm expo:doctor` | Validate the Expo environment |

Notification worker:

```bash
pnpm --filter @chokro/api notify:now       # send due notifications once
pnpm --filter @chokro/api notify:schedule  # run on cron schedule
```

## Testing

Tests use Jest 30 with ts-jest and run against in-memory PGlite, so no external database is needed:

```bash
pnpm test
```

The suite covers auth, listings, feed, wallet and escrow, disputes, trust gate, negotiations, custody handovers, partner KYC, zone telemetry, auctions, streaks and badges, and more.

## Deployment

The provided `Dockerfile` builds a multi-stage image (Node 22 Alpine): frozen-lockfile install → Turbo build of `@chokro/api` → non-root runtime serving the Next.js standalone output on port 3000 with a `/api/health` health check.

For production:

1. Provide a managed PostgreSQL instance and set `DATABASE_URL`.
2. Generate strong values for `JWT_SECRET` and `QR_SECRET`.
3. Run migrations against the production database (`pnpm db:migrate`).
4. Build and deploy the API image behind TLS; keep CORS restrictions appropriate to your clients.
5. Deploy the notification worker (`notify:schedule`) alongside the API.
6. Configure optional integrations (Pusher, SMTP, vision, maps) as needed.

## Roles

- **Individual** — posts listings, scans items for valuation, drops off materials at QR drop zones, earns and redeems wallet credits.
- **Partner** — verified collectors and recyclers who handle pickups, custody handovers, deposits, and processing.
- **Admin** — verifies partners, manages rate cards and campuses, monitors drop zones, adjudicates the trust gate, and settles redemptions.
