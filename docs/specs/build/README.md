# Build Specs — Full Circular Loop & 16-Feature Suite

These build specifications take the codebase from a working prototype to a **complete, submission-ready circular economy platform** fulfilling all **16 features across 4 team members** for **CSE471 (System Analysis and Design)**.

They sit **downstream** of the capability specs in `../`. Where the two disagree on scope, SPEC 10's resolution applies: the reverse-logistics pivot supersedes the manifest's non-goal list, while the manifest keeps strict authority over trust invariants.

---

## Specification Directory & Ownership Index

```
10 ── Loop Closure Manifest & Correctness Debt (Core Spine)
 │
 ├── SPRINT 2 / MODULE 2: LOOP CLOSURE & DISCOVERY
 │    ├── 11 ── Verified Deposit Path (m4 Imran F2)
 │    ├── 12 ── Trust Gate & Anomaly Engine (m1 Sadat F2 & F4) ◄── LOOP CLOSES HERE
 │    ├── 15 ── Partner KYC & Licence OCR Gate (m1 Sadat F1)
 │    ├── 16 ── Listing Media & Privacy Ingest Pipeline (m2 Sameer F1)
 │    ├── 17 ── Hyperlocal Discovery & Demand Board (m2 Sameer F2 & F3)
 │    └── 19 ── Drop-Zone Telemetry & Poster Gen (m4 Imran F1)
 │
 └── SPRINT 3 / MODULE 3: SETTLEMENT, VALUE & GOVERNANCE
      ├── 13 ── Wallet Settlement & Auction Escrow (m4 Imran F3 & m1 Sadat F3)
      ├── 14 ── Impact Ledger & Institutional ESG (m4 Imran F4)
      ├── 18 ── Binding Counter-Offer Engine (m2 Sameer F4)
      ├── 20 ── Frontend Screen Inventory & Surface Matrix (Gap 1 Solution)
      ├── 21 ── Comprehensive Demo Seed Data & Scenario Matrix (Gap 3 Solution)
      └── 22 ── Rubric Defense Matrix & CO5 Viva Modification Guide (Gap 2 Solution)
```

---

## Detailed Build Spec Inventory

| Spec | Title & Feature Mapping | Primary Domain Ownership | External API & Degraded Fallback |
|---|---|---|---|
| [**10**](10-loop-closure-manifest.md) | **Loop Closure Manifest** | Reconciled invariants, error taxonomy, entity vocabulary, bid serialisation. | System Architecture |
| [**11**](11-verified-deposit-path.md) | **Verified Deposit Path** *(m4 F2)* | Drop-zone sessions, camera evidence, pending credits, scale emptying. | Firebase Cloud Messaging / Local Session |
| [**12**](12-trust-gate.md) | **Trust Gate & Fraud Surface** *(m1 F2, F4)* | Pure decision function, pHash image check, OTP custody handshake. | Telegram Bot Webhook / Resend Email / Twilio |
| [**13**](13-wallet-settlement.md) | **Wallet Settlement & Escrow** *(m4 F3, m1 F3)* | Redemption requests, MFS cash-out, auction escrow, dispute arbitration. | SSLCommerz Sandbox / Mock MFS Gateway |
| [**14**](14-impact-and-institutional-value.md) | **Impact Ledger & ESG Certificates** *(m4 F4)* | Verified mass audits, Climatiq emission factors, signed certificates. | Climatiq API / ISO 14044 Offline Tables |
| [**15**](15-partner-doc-intelligence-ocr.md) | **Partner KYC & Licence OCR** *(m1 F1)* | Trade license OCR entity extraction, expiry check, DoE e-waste gate. | Google Cloud Vision OCR / Local Regex Parser |
| [**16**](16-listing-media-privacy-pipeline.md) | **Listing Media & Privacy Ingest** *(m2 F1)* | Server-side EXIF/GPS coordinate strip, responsive WebP generation. | Cloudinary CDN / Sharp Local Pipeline |
| [**17**](17-hyperlocal-feed-and-demand-board.md) | **Hyperlocal Feed & Demand Board** *(m2 F2, F3)* | PGlite Haversine distance ranking, Thana facets, reverse demand matching. | OSM Nominatim / OneSignal Push API |
| [**18**](18-counter-offer-negotiation.md) | **Binding Counter-Offer Engine** *(m2 F4)* | Bilateral bargaining state machine, single-active-offer lock, TTL expiry. | Pusher Realtime Channels / Smart Polling |
| [**19**](19-zone-telemetry-and-posters.md) | **Drop-Zone Telemetry & Posters** *(m4 F1)* | Fill-rate modeling, auto-empty dispatch trigger, HMAC-SHA256 poster generator. | Google Static Maps API / Vector SVG Canvas |
| [**20**](20-frontend-screen-inventory.md) | **Frontend Screen Inventory** *(All)* | Contract for 18 Mobile Screens + 12 Admin Web Pages with routes and hooks. | React Native (Expo) + Next.js App Router |
| [**21**](21-seed-data-and-scenarios.md) | **Demo Seed Data & Scenario Matrix** *(All)* | Dynamic seed records across ~25 tables with 7 active live-demo scenarios. | Dynamic Relative Timestamps (`Date.now() + t`) |
| [**22**](22-rubric-matrix-and-viva-guide.md) | **Rubric Matrix & CO5 Viva Guide** *(All)* | 16-feature 5/5 score defense + live schema/backend/frontend modification recipes. | CSE471 Academic Defense & Live Viva (CO5) |

---

## Testing & Verification Standard

All specifications follow the **Single Seam Testing Standard**:
- Handlers imported directly and invoked with constructed `Request` objects against **PGlite**.
- Zero external API dependencies required for CI test runs (all fallbacks exercise with keys removed).
- Strict invariant validation (append-only ledger, single-use sessions, monotonic bid sequencing, and cryptographic token verification).
