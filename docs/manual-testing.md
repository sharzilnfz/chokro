# Chokro — Manual Testing Guide (Sprint 1)

Monorepo: `@chokro/api` (Next.js 16, port 3000), `@chokro/mobile` (Expo), `@chokro/db` (Drizzle + Postgres), `@chokro/shared` (zod enums). pnpm 11.18, Node ≥ 22.13. The API and admin console are the same Next.js process on **`http://localhost:3000`**; the mobile app runs in **Expo Go**.

## 1. Prereqs & one-time setup

```bash
pnpm install
docker compose up -d && docker compose ps   # postgres:17 on 5432 (db/user/pass all "postgres", db "chokro")
pnpm db:setup                                # db:push + db:migrate + db:seed
pnpm --filter @chokro/api dev                # Next on port 3000
```

Health check — expect `200`:

```bash
curl -s http://localhost:3000/api/health   # {"status":"ok","db":"connected",...}
```

Mobile:

```bash
pnpm --filter @chokro/mobile start   # i = iOS sim, a = Android, QR = Expo Go
```

Physical phone needs the LAN IP (restart before bundling):

```bash
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000 pnpm --filter @chokro/mobile start
```

**Seed accounts — password `password123` for all:**

| Email | Role | Notes |
|---|---|---|
| `admin@chokro.org` | ADMIN | Admin console |
| `user@chokro.org` | INDIVIDUAL | Demo user |
| `partner@chokro.org` | PARTNER | Pre-verified: BanglaBin Recycling Ltd |

Seed also adds 3 rate rows (PLASTICS/GOOD/kg 45.00, CLOTHES/FAIR/kg 30.00, E_WASTE/GOOD/piece 250.00).

## 2. Automated tests

```bash
pnpm --filter @chokro/api test   # or: pnpm test  (Jest → NODE_ENV=test → in-memory store, no Postgres needed)
pnpm typecheck
pnpm lint
```

## 3. Flow A — Web admin console

1. Open `/admin`, sign in as `admin@chokro.org`.
2. **Rate card → Publish a rate**: category PLASTICS, condition GOOD, price `52.00`. Note the unit is **derived** (kg for materials, piece for APPLIANCES/E_WASTE) — not editable. Publish again with `55.00` → newest row badged **Current**, older **Previous**.
3. **Partner queue**: create an `APPLIED` app via API first (user token, see commands below), approve it → status `VERIFIED` and DoE status flips to **Licensed** (granted only when a DoE doc is on file). Non-admin `/admin` sign-in is rejected; non-admin `/api/admin/*` → 403.

Create an application for the queue:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"user@chokro.org","password":"password123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s -X POST http://localhost:3000/api/partners/apply -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"orgName":"GreenLoop Traders","types":["RECYCLER"],"eWasteLicensed":true,"doeLicenseDoc":"DOE-2026-4412.pdf"}'
# eWasteLicensed:true without doeLicenseDoc → 400 (DoE gate)
```

## 4. Flow B — Mobile

1. **Sign up** (fresh email, ≥6-char password) → lands on Browse. Sign out/in; relaunch app to verify `SecureStore` session restore.
2. **List tab**: add photo (≤1600px, <500KB), category `PLASTICS` → unit **kg**, weight `2.5`, GOOD → publish. Then `E_WASTE` → unit **pieces** (quantity), `1`, publish.
3. **Rates tab**: grouped current rates incl. your Flow A publishes.
4. **Wallet**: Verified `0.00`, Pending `0.00`, empty-ledger note about Sprint 1.
5. **Browse/Feed**: filter chips (category + condition), cursor pagination ("Load more"), pull-to-refresh.

## 5. Flow C — Credit timeline

1. Get the user UUID: `curl http://localhost:3000/api/auth/me -H "Authorization: Bearer $TOKEN"` (the `id` field).
2. Admin adjusts:

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@chokro.org","password":"password123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s -X POST http://localhost:3000/api/admin/wallet/adjust -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"userId":"<USER_UUID>","amount":250,"reason":"Manual verified adjustment for testing"}'
```

3. Wallet tab shows **250.00** (ADJUST/Verified row). Post `-50` → **200.00**. Rows are append-only (DB trigger) — undo means an opposite adjustment.

## 6. Flow D — Drop zones

1. **/admin/drop-zones** → create zone (name, institution, accepted categories) → **Print poster** (allow pop-ups).
2. Resolve the QR token with a user token: `GET /api/drop-zones/resolve?token=<QR_TOKEN>` → `200 {"zone":{...}}`; tampered token → 400; no Bearer → 401.
3. **Scan tab** in mobile: scan the poster QR (or paste token) → shows "REGISTERED DROP ZONE" card. **Recognition only** — explicit amber notice: no deposit, no credit, wallet unchanged.

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `503` on any route | DB down; memory fallback only active in `NODE_ENV=test` | Start Postgres; check `DATABASE_URL` in `apps/api/.env` |
| health `503 degraded` | Postgres down | `docker compose up -d` |
| `401` | Bad/missing Bearer token | Log in first |
| `403` | Non-ADMIN hit `/api/admin/*` | Use `admin@chokro.org` |
| `400 Invalid listing data` | kg categories need kg+weight; APPLIANCES/E_WASTE need piece+pieceCount | Match the mobile UI's derived units |
| `400 Unable to create account` | Email exists | Fresh email |
| Mobile can't reach API on device | `localhost` resolves to the phone | Use `EXPO_PUBLIC_API_URL=<LAN-IP>:3000` |
| Poster won't open | Pop-ups blocked | Allow pop-ups for localhost:3000 |
| Rates tab empty | No rows with `effective_from <= now` | Publish a rate in admin |
| Wallet stays 0.00 | Wrong userId, or txn not VERIFIED | Exact UUID from `/api/auth/me`; adjust sets VERIFIED |
