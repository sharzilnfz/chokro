# SPEC 22 — Rubric Defense Matrix & CO5 Live Viva Modification Guide

**Status:** build spec  
**Purpose:** Resolves Gap 2 & Academic Compliance (16-feature rubric defense + live exam modification runbook)  
**Target:** CSE471 System Analysis and Design Lab Evaluation  

---

## Part 1: Comprehensive 16-Feature Rubric Defense Matrix

Every feature is designed to score **5/5 Marks** across the rubric: Frontend (1) + Backend (1) + Database (1) + Innovation (1) + External API (1).

### Member 1 — Sadat SKD (`m1` · Identity, Trust & Partners)

| # | Feature Name | Rubric Group | External API & Fallback | Innovation Claim to Defend | Banned-List Defense (Why it's not generic Admin/RBAC) |
|---|---|---|---|---|---|
| **F1** | **Partner KYC & Licence Document Intelligence** | Option 10 / Retrofit | **Google Cloud Vision OCR**<br>*(Fallback: Regex Parser)* | Automated text extraction, expiry validation, and discrepancy scoring. | Defends the statutory **DoE Licensing Gate** under E-Waste Rules 2021, not basic user approval. |
| **F2** | **Trust Gate & Fraud Anomaly Engine** | Group A Option 2 | **Telegram Bot Webhook**<br>*(Fallback: Local Queue Log)* | Pure decision function with any-fail escalation and pHash duplicate detection. | Implements a mathematical fraud stack rather than a subjective human review toggle. |
| **F3** | **Escrow Settlement & Quality Arbitration** | Group B Option 3 | **Resend Email API**<br>*(Fallback: In-App Message Store)* | Atomic escrow hold with two-sided photo evidence arbitration. | Manages bilateral financial liabilities, not a generic ticketing system. |
| **F4** | **Custody Handover & OTP Handshake** | Group B Option 4 | **Twilio SMS API**<br>*(Fallback: Server-Side TOTP)* | Two-sided cryptographic handshake preventing imposter pickups. | Binds physical material custody to a cryptographically validated token. |

---

### Member 2 — Ahmad Sameer (`m2` · Circular Marketplace & Discovery)

| # | Feature Name | Rubric Group | External API & Fallback | Innovation Claim to Defend | Banned-List Defense (Why it's not generic Listing CRUD) |
|---|---|---|---|---|---|
| **F1** | **Listing Media & Privacy Ingest Pipeline** | Option 7 / Retrofit | **Cloudinary CDN API**<br>*(Fallback: Sharp Local Pipeline)* | Zero-trust server-side EXIF/GPS coordinate stripping with multi-resolution WebP generation. | Enforces **Invariant A9 (Photo Privacy)**; strips sensitive home coordinates before public listing. |
| **F2** | **Hyperlocal Discovery & Radius Feed** | Group C Option 5 | **OSM Nominatim API**<br>*(Fallback: Campus Polygon Lookup)* | PGlite-compatible pure SQL trigonometric Haversine distance ranking with Thana facets. | Replaces dumb nationwide lists with transport-economics-aware spatial filtering. |
| **F3** | **Reverse Recycler Demand Board** | Group C Option 6 | **OneSignal Push API**<br>*(Fallback: In-App Inbox Queue)* | Inverts marketplace: matches standing buyer demands against new listings upon creation. | Algorithmic event-driven matching dispatcher, not a passive bulletin board. |
| **F4** | **Binding Counter-Offer Engine** | Group B Option 4 | **Pusher Realtime Channels**<br>*(Fallback: Smart ETag Polling)* | Bilateral state machine with strictly one active offer, TTL expiry, and atomic listing lock. | Replaces unformatted free chat with enforceable contract state transitions. |

---

### Member 3 — Sharzil Nafis (`m3` · Valuation & Logistics)

| # | Feature Name | Rubric Group | External API & Fallback | Innovation Claim to Defend | Banned-List Defense (Why it's not generic Admin Pricing) |
|---|---|---|---|---|---|
| **F1** | **Market-Benchmarked Valuation Engine** | Option 8 / Retrofit | **Metals-API / AlphaVantage**<br>*(Fallback: Stored Benchmark Cache)* | Live commodity price benchmarking with drift-detection badges and effective-dated rate history. | Defends **reproducible pricing**: rates are superseded, never overwritten; history is immutable. |
| **F2** | **AI Next-Life Scrap Vision Agent** | Group D Option 7 | **OpenAI GPT-4o-mini Vision**<br>*(Fallback: Rule Heuristic Classifier)* | Constrained multi-modal classification joined to effective rate cards with e-waste hazard locks. | AI output is constrained to domain schemas; e-waste legally forces human escalation. |
| **F3** | **Smart Geo-Dispatch & Route Optimizer** | Group C Option 5 | **Mapbox Matrix API**<br>*(Fallback: Haversine TSP Orderer)* | Capacity-constrained multi-stop assignment based on collector vehicle limits and category licenses. | Solves vehicle capacity routing, not just plotting pins on a map. |
| **F4** | **B2B Bulk Scrap Live Auction Engine** | Group B Option 3 | **Pusher Channels**<br>*(Fallback: Monotonic Sequence Polling)* | Server-authoritative monotonic bid ordering, sealed reserve hiding, and anti-sniping extension. | Real-time concurrent bidding engine with race-condition prevention in DB. |

---

### Member 4 — Imran Ahmed Upom (`m4` · Drop Zones, Wallet & Impact)

| # | Feature Name | Rubric Group | External API & Fallback | Innovation Claim to Defend | Banned-List Defense (Why it's not generic Admin CRUD) |
|---|---|---|---|---|---|
| **F1** | **Drop-Zone Telemetry & Poster Gen** | Option 9 / Retrofit | **Google Static Maps API**<br>*(Fallback: Vector SVG Renderer)* | Telemetry-driven fill-rate modeling with auto-empty dispatch trigger and HMAC-SHA256 signed QR. | Dynamic physical-digital bridge preventing bin overflow, not a static CRUD table. |
| **F2** | **Smart QR Deposit & Weight Gate** | Group A Option 1 | **Firebase Cloud Messaging**<br>*(Fallback: Local Session Token)* | Single-use time-bounded deposit sessions; proportional bin-mass apportionment on emptying. | Credits derive only from verified scale readings, never from self-declared claims. |
| **F3** | **Green Wallet MFS Cash-Out Engine** | Group B Option 4 | **SSLCommerz Sandbox**<br>*(Fallback: Mock MFS Webhook)* | Append-only ledger with concurrency locks, monthly liability caps, and honest fee disclosure. | Real money exit mechanism with compensating transaction rollback. |
| **F4** | **Carbon Avoidance Ledger & ESG Certs** | Group D Option 8 | **Climatiq Emission API**<br>*(Fallback: ISO 14044 Factor Table)* | Immutable impact ledger linking verified mass to audited emission factors and signed certificates. | Creates legally defensible corporate compliance documents, not vanity badges. |

---

## Part 2: CO5 Live Viva Modification Guide (Exam Preparation)

Under the **CSE471 CO5 Rubric**, an examiner will ask each student to perform live modifications across **Frontend**, **Backend**, and **Database Schema**. Below are ready-to-execute recipes for each team member.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MEMBER 1 (Sadat) — LIVE MODIFICATION RECIPES                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • DB SCHEMA: Add `trade_license_jurisdiction` to `kyc_extractions`:                    │
│   1. Edit `packages/db/src/schema.ts` -> add varchar('jurisdiction', { length: 60 })   │
│   2. Run `pnpm db:push` to apply to PostgreSQL / PGlite                                │
│ • BACKEND: Add a validation rule to `POST /api/v1/partners/kyc/extract`:               │
│   Edit route handler -> if (!body.jurisdiction) return apiError("Jurisdiction req", 400)│
│ • FRONTEND: Add a jurisdiction selector in `PartnerConsoleScreen.tsx`:                 │
│   Add `<AdminSelect label="Jurisdiction" options={['DHAKA_NORTH', 'DHAKA_SOUTH']} />`  │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       MEMBER 2 (Sameer) — LIVE MODIFICATION RECIPES                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • DB SCHEMA: Add `urgent_collection` boolean flag to `buyer_demands`:                  │
│   1. Edit `packages/db/src/schema.ts` -> add boolean('urgent_collection').default(false)│
│   2. Run `pnpm db:push`                                                                │
│ • BACKEND: Update `GET /api/v1/listings/feed` sorting logic:                           │
│   Add query param `?urgentFirst=true` -> order by `buyer_demands.urgent_collection DESC`│
│ • FRONTEND: Add an "Urgent Collection (24h)" toggle in `DemandsScreen.tsx`:            │
│   Add `<Switch value={isUrgent} onValueChange={setIsUrgent} />` in Demand Composer     │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      MEMBER 3 (Sharzil) — LIVE MODIFICATION RECIPES                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • DB SCHEMA: Add `bid_increment_step` to `auction_lots`:                               │
│   1. Edit `packages/db/src/schema.ts` -> add decimal('bid_increment_step').default(500)│
│   2. Run `pnpm db:push`                                                                │
│ • BACKEND: Enforce dynamic bid increments in `POST /api/v1/auction-lots/[id]/bids`:    │
│   Check: `if (newAmount < currentBid + lot.bid_increment_step) return apiError(...)`   │
│ • FRONTEND: Display Next Minimum Bid badge in `LotDetailScreen.tsx`:                   │
│   Render `<Text>Min Next Bid: ৳{currentBid + lot.bid_increment_step}</Text>`           │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       MEMBER 4 (Imran) — LIVE MODIFICATION RECIPES                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • DB SCHEMA: Add `cleaning_agent_notes` to `zone_capacity_logs`:                       │
│   1. Edit `packages/db/src/schema.ts` -> add text('cleaning_agent_notes')              │
│   2. Run `pnpm db:push`                                                                │
│ • BACKEND: In `POST /api/v1/wallet/redemptions`, add a ৳5,000 single-transaction cap: │
│   Check: `if (amount > 5000) return apiError("Single cash-out exceeds ৳5,000", 400)`   │
│ • FRONTEND: Add an emergency maintenance banner on `QRScannerScreen.tsx`:              │
│   If `zone.status === 'PAUSED'`, render `<Banner type="warning">Bin Paused</Banner>`   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
