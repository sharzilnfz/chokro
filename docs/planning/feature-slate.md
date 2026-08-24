# Chokro — Feature Slate (16 features, 4 members)

Built **on top of** the shipped Sprint 1. Nothing is discarded. Each Module-1 feature gets an
external-API retrofit so it reaches 5/5; each member then adds 3 new features.

---

## 1. The product this builds (one demo story)

Every feature below is load-bearing in this single narrative. If a feature can be cut without
breaking the story, it doesn't belong.

```
Student photographs a pile of scrap
   └─► AI Vision names material + condition + weight        [Sharzil F2]
       └─► priced against a market-benchmarked rate card    [Sharzil F1]
           ├─► DROP AT CAMPUS BIN
           │     └─► QR session + weight gate → PENDING credit   [Imran F2]
           └─► BOOK A PICKUP
                 └─► nearest collector, capacity-aware route     [Sharzil F3]
                       └─► OTP handover, custody transfers       [Sadat F4]
   └─► Trust Gate verifies or escalates; fraud alerts staff  [Sadat F2]
       └─► credits flip PENDING → VERIFIED
           ├─► withdraw to bKash/Nagad                       [Imran F3]
           └─► CO₂e saved + ESG certificate                  [Imran F4]

Campus/factory accumulates tonnage
   └─► bulk lot to B2B live auction, recyclers bid           [Sharzil F4]
         └─► funds in escrow until inspection passes         [Sadat F3]

Recyclers post standing demands ("need 500kg copper")        [Sameer F3]
Buyers browse a hyperlocal radius map feed                   [Sameer F2]
Buyer and seller bargain with binding counter-offers         [Sameer F4]
All photos land via CDN with GPS stripped                    [Sameer F1]
Partner onboarding gated by OCR-verified DoE licence         [Sadat F1]
```

**The spine that was missing and is now covered:** material actually moves (F2s), evidence is
captured, verification flips credits (Sadat F2), and money leaves the system (Imran F3). That is
what makes the wallet real instead of decorative.

---

## 2. m1 — Sadat · Trust, Verification & Settlement

Owns `partners`. Theme: *nothing is trusted until it's proven.*

| # | Feature name | External API | New tables | Frontend surface |
|---|---|---|---|---|
| F1 | **Partner KYC & Licence Document Intelligence** *(retrofit)* | Google Cloud Vision OCR | `kyc_extractions` | Admin review queue showing extracted vs. submitted fields |
| F2 | **Trust Gate — Deposit Verification & Fraud Anomaly Engine** | Telegram Bot API | `verification_decisions`, `fraud_flags` | Admin escalation queue + evidence bundle |
| F3 | **Escrow Settlement & Quality Dispute Arbitration** | Resend (email + inbound webhook) | `escrow_holds`, `dispute_tickets`, `dispute_evidence` | Dispute filing screen w/ photo evidence, admin arbitration panel |
| F4 | **Chain-of-Custody Handover & OTP Handshake** | Twilio SMS | `custody_handovers`, `otp_challenges` | Collector scan screen + giver OTP screen |

**Innovation claims**
- **F1** — OCR extracts licence number and expiry from the uploaded DoE document, auto-cross-checks against typed input, and flags mismatch or expiry. The admin *adjudicates*; the system *validates*.
- **F2** — A pure decision function over a signal stack (photo recency, geofence, weight-vs-declared delta, deposit velocity, account age). E-waste can never auto-clear regardless of green signals. Every verified credit traces to a decision ID.
- **F3** — Funds lock on auction win, release only on inspection pass; a dispute freezes the linked credits mid-flight.
- **F4** — Custody is a signed, timestamped transfer, not a status field. Neither party can complete alone.

**Banned-list defence (F1 is the exposed one):** as shipped, "partner verification + approve/reject"
reads as RBAC plus generic admin activity. The retrofit moves the feature's centre of gravity to
*document intelligence and compliance gating* — OCR extraction, expiry validation, and a
licence-conditional capability flag. Defend the **DoE licence gate**, never the approve button.

---

## 3. m2 — Sameer · Marketplace & Discovery

Owns `listings`. Theme: *the right material finds the right buyer nearby.*

| # | Feature name | External API | New tables / columns | Frontend surface |
|---|---|---|---|---|
| F1 | **Listing Media Pipeline & Privacy-Safe Evidence Ingest** *(retrofit)* | Cloudinary | `listing_media` | Upload progress, derived thumbnails, EXIF-stripped notice |
| F2 | **Hyperlocal Geo-Discovery & Radius Filter Feed** | OpenStreetMap Nominatim | `lat`/`lng`/`thana` on `listings`, `service_areas` | Map + radius slider (1–10 km), Thana/Ward facets |
| F3 | **Reverse Marketplace — Recycler Demand Board & Auto-Matching** | OneSignal push | `buyer_demands`, `demand_matches` | Recycler demand composer, seller "you match" inbox |
| F4 | **Binding Counter-Offer Negotiation Engine** | Ably realtime | `negotiation_threads`, `negotiation_offers` | Live thread w/ offer/counter/accept, expiry countdown |

**Innovation claims**
- **F1** — Server-side EXIF/GPS strip before persistence, plus one canonical upload path shared by listings, deposits, and dispute evidence. Privacy is enforced at the seam, not asked for politely.
- **F2** — Reverse-geocode to Bangladesh Thana/Ward so the feed speaks in local administrative units, not raw coordinates. Radius ranking by haversine distance.
- **F3** — Inverts the marketplace: demand is posted first, and supply is matched to it automatically on listing creation. A standing 500 kg copper demand notifies the moment a match appears.
- **F4** — A real state machine: one live offer per thread, TTL expiry, accept is binding and writes the transaction. Not a chat box with numbers in it.

**Banned-list defence:** F1 is the exposed one — plain listing CRUD reads as trivial. Defend the
**dual-unit invariant** (`APPLIANCES`/`E_WASTE` → piece count; everything else → kg, enforced in
`packages/shared` and unbreakable from the client) plus the privacy-preserving media pipeline.

---

## 4. m3 — Sharzil · Valuation & Logistics *(locked)*

Owns `rate_card_entries`. Theme: *knowing what it's worth, and getting it moved.*

| # | Feature name | External API | New tables | Frontend surface |
|---|---|---|---|---|
| F1 | **Market-Benchmarked Valuation Engine** *(retrofit)* | Commodity price feed (metals-api / Alpha Vantage commodities) | `rate_benchmarks` | Public estimator + "your rate is 12% under market" drift badge |
| F2 | **AI Next-Life Scrap Vision Agent** | OpenAI Vision (`gpt-4o-mini` class) | `valuation_scans` | Camera → scan result card → one-tap prefilled listing |
| F3 | **Smart Geo-Dispatch & Route Optimizer** | Mapbox Directions + Matrix | `pickup_orders`, `dispatch_assignments` | Booking screen + collector route map w/ ordered stops |
| F4 | **B2B Bulk Scrap Auction & Live Bidding Engine** | Pusher Channels | `auction_lots`, `auction_bids` | Lot detail w/ live bid ticker + countdown |

**Innovation claims**
- **F1** — Local BDT rates continuously benchmarked against the global commodity index with FX conversion; drift beyond a threshold flags the card as stale. Turns a static price table into a market instrument.
- **F2** — Vision output is *constrained* to the nine existing categories and four condition bands, then joined to the effective rate card — so the model proposes and the database prices. Detected e-waste force-routes to `RECYCLE` and cannot be overridden by the user. Low confidence degrades to the manual picker.
- **F3** — Capacity-constrained assignment: nearest eligible collector *with remaining vehicle capacity and matching category licence*, then a Matrix call orders the stops. Not just "show a map".
- **F4** — Sealed reserve, anti-snipe countdown extension, and server-authoritative bid ordering — a bid is only valid if the server says it arrived first.

**Banned-list defence — this is your most exposed feature.** As shipped, "rate-card admin console"
reads squarely as *generic admin config*. Do not demo the admin table. Demo `GET /rate-card/estimate`
(public, user-facing) and the **effective-dated versioning** — editing a rate supersedes rather
than overwrites, so history is preserved and every past valuation stays reproducible. The admin
CRUD is the maintenance surface for the pricing engine, not the feature.

---

## 5. m4 — Imran · Drop Zones, Wallet & Impact

Owns `drop_zones`. Theme: *from physical bin to real money to proven impact.*

| # | Feature name | External API | New tables | Frontend surface |
|---|---|---|---|---|
| F1 | **Drop-Zone Locator & Print-Ready Zone Poster** *(retrofit)* | Google Static Maps | `zone_capacity_logs` | In-app zone map/list + admin poster with embedded location map |
| F2 | **Smart QR Deposit Session & Weight-Scale Gate** | Firebase Cloud Messaging | `drop_sessions`, `deposit_records` | Scan → time-limited session → category → camera-only evidence → receipt |
| F3 | **Green Wallet Payout & MFS Withdrawal Engine** | SSLCommerz sandbox *(prefer over bKash — faster access)* | `payout_requests`, `payout_events` | Withdraw screen w/ guards, status timeline |
| F4 | **Carbon Avoidance Ledger & ESG Certificate Generator** | Climatiq emission-factor API | `impact_audits`, `sustainability_certificates` | Impact dashboard + downloadable signed certificate |

**Innovation claims**
- **F1** — The QR on the poster is an HMAC-SHA256 signed opaque token validated with `crypto.timingSafeEqual` — unguessable from sequence and tamper-evident. Already built; now paired with a real locator map.
- **F2** — A deposit is only creditable inside a short-lived server-issued session bound to that zone, that user, and that time window. Camera-only evidence (gallery uploads rejected), net weight captured, zone category allow-list enforced at scan time. Writes the first genuine PENDING credit in the system.
- **F3** — Redemption guards enforced server-side: verified-balance-only, minimum ৳300, monthly cap, velocity check. The ledger stays append-only — a payout is a new `REDEEM` row, never a balance mutation.
- **F4** — Real emission factors from a live API rather than a hardcoded constant, applied only to **verified** mass, with honest "estimated" wording. Certificate carries a verifiable hash.

**Banned-list defence:** "drop-zone management" reads as admin CRUD. Defend the **signed QR token
scheme and the deposit session gate** — cryptography and physical-world verification, not a form.

---

## 6. Shared scaffolding — claimed by nobody, needed by everyone

The rubric bans these as features, but the product cannot run without them. Build collaboratively,
claim on no one's scoresheet.

1. **Role-based mobile navigation.** Mobile is currently individual-only. Collector needs a task/route surface (Sharzil F3, Sadat F4); recycler needs auction + demand surfaces (Sharzil F4, Sameer F3). Without this, four features have nowhere to live.
2. **`/api/v1` namespace.** Assignment 03 specifies `/api/v1/...`; the code serves `/api/...`. Add the versioned path.
3. **Per-member dev port** = last 4 digits of each student ID.
4. **Seed dataset** that leaves no screen empty: zones, rate rows, collectors with vehicles, recyclers, live auction lots, a filled wallet, a pending escalation.
5. **Degraded-mode fallback for every external API** — see risks below.

---

## 7. Risks and flags — read before committing

**Verified constraints:**
- **PostGIS is not available under PGlite**, which the Jest suites run on. Sameer F2 and Sharzil F3 must use haversine distance in plain SQL, not spatial types, or the tests won't run.
- **Push notifications need an Expo dev build** — FCM/OneSignal don't work in Expo Go on recent Android SDKs. Affects Imran F2 and Sameer F3. Budget for the dev build or fall back to in-app notification rows plus a manual "send" trigger you can fire live.

**Judgment calls:**
- **A library is not an external API.** PDFKit, Puppeteer, and `otplib` are libraries — claiming them for the Integration mark is a stretch an examiner may reject. This is why Imran F4 uses Climatiq (a real API) rather than a PDF library, and why Imran F2's TOTP session is paired with FCM.
- **Vendor reuse across members is fine.** The rule is one integration *per member*, not globally unique vendors. Within each member's four features I kept four distinct APIs so no one has to argue the point.
- **Every external API needs a cached/stubbed fallback path** so a dead key, rate limit, or missing venue wifi cannot break a live viva. Wire the fallback the same day you wire the API — not later.
- **SSLCommerz over bKash** for Imran F3: bKash merchant sandbox access is slow to obtain. If neither lands in time, a documented mock that still performs a real HTTP round-trip is defensible; a hardcoded success is not, and scores 0 under the hardcoding rule.
- **Scope is aggressive.** 12 new features plus 4 retrofits, roughly 22 new tables, across two labs. Feasible only because the features share the spine. Guard the sequencing.

**Confirm with the instructor:** the rubric's 5-mark breakdown implies an external API *per
feature*, while the mandatory-requirements section says at least one *per member*. This slate
assumes per-feature (the safer reading). If per-member is accepted, eight integrations drop out
and the timeline relaxes considerably. Worth asking before building.

---

## 8. Build order

**Now — unblock Assignment 03 (Sharzil)**
1. Add `/api/v1` namespace; configure the custom port.
2. Ship `POST /api/v1/valuation/classify-and-estimate` (F2 backend) — it doesn't exist yet, so
   Assignment 03 currently has only one documentable endpoint, at the wrong path.
3. Document both endpoints in Postman with screenshots.

**Module 2 / Lab 6 — one feature each, and close the loop**
Sharzil F2 (Vision) · Imran F2 (Deposit session) · Sadat F2 (Trust Gate) · Sameer F2 (Geo-feed)
→ Ship role-based mobile navigation and the seed dataset alongside these. At the end of Lab 6 the
loop closes: scan → deposit → verify → credited. That is the first point where the demo tells a
whole story.

**Module 3 / Lab 7 — two features each**
Sharzil F3 + F4 · Sadat F3 + F4 · Sameer F3 + F4 · Imran F3 + F4
→ Then the Module-1 retrofits, then the timed end-to-end demo script.

**Verification gate per feature:** a real DB row written through the API, the external call
observable in logs, the fallback path exercised with the key removed, and one Jest test covering
the invariant that feature is defending.
