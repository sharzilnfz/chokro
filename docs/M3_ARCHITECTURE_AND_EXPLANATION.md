# Chokro (চক্র) — M3 Comprehensive Architecture, Sequence Diagrams & Feature Defense Guide
> **Academic Context:** CSE471 — System Analysis and Design  
> **Student / Member:** `m3` — Sharzil Nafis (Valuation & Logistics)  
> **Team Members:** `m1` Sadat (Trust & Verification), `m2` Sameer (Marketplace), `m3` Sharzil (Valuation & Logistics), `m4` Imran (Drop Zones & Wallet)  
> **Target Deliverables:** Module 2 & 3 Evaluations, Assignment 03 (Postman Collection & Custom Port), Live Modification Viva (CO5)

---

## Table of Contents
1. [Executive Summary & The Unified Chokro Narrative](#1-executive-summary--the-unified-chokro-narrative)
2. [CSE471 Grading Rubric Alignment Matrix (5 Marks × 4 Features = 20 Marks)](#2-cse471-grading-rubric-alignment-matrix)
3. [Full System Architecture & Monorepo Design](#3-full-system-architecture--monorepo-design)
4. [Database Schema & ERD (M3 Focus)](#4-database-schema--erd-m3-focus)
5. [Deep Feature Breakdown, Mechanics & Sequence Diagrams](#5-deep-feature-breakdown-mechanics--sequence-diagrams)
   - [Feature 1: Market-Benchmarked Valuation Engine (Retrofit)](#feature-1-market-benchmarked-valuation-engine-retrofit)
   - [Feature 2: AI Next-Life Scrap Vision Agent](#feature-2-ai-next-life-scrap-vision-agent)
   - [Feature 3: Smart Geo-Dispatch & Route Optimizer](#feature-3-smart-geo-dispatch--route-optimizer)
   - [Feature 4: B2B Bulk Scrap Auction & Live Bidding Engine](#feature-4-b2b-bulk-scrap-auction--live-bidding-engine)
6. [Cross-Team Dependencies & How to Defend Them to Your Teacher](#6-cross-team-dependencies--how-to-defend-them-to-your-teacher)
7. [Role-Based Navigation & Persona Switcher Guide](#7-role-based-navigation--persona-switcher-guide)
8. [Live Teacher Demonstration Script & Viva Defense (CO5 Preparation)](#8-live-teacher-demonstration-script--viva-defense-co5-preparation)
9. [Assignment 03: API & Postman Catalog](#9-assignment-03-api--postman-catalog)

---

## 1. Executive Summary & The Unified Chokro Narrative

Chokro (*চক্র* = Cycle) is a circular economy platform built for Bangladesh connecting individuals, collection drivers, recycling factories, and campus hubs. 

Rather than isolated CRUD screens, every feature built by every team member fits into **one continuous demo story**:

```mermaid
flowchart TD
    A[Student snaps photo of scrap pile] --> B[AI Scrap Vision Agent classifies & validates invariants - Sharzil F2]
    B --> C[Market Benchmark Engine calculates real-time BDT value - Sharzil F1]
    C --> D{Choose Fulfillment Path}
    
    D -->|Campus Smart Bin| E[Scan QR Token & Deposit Scale Gate - Imran F2]
    E --> F[PENDING Credits Issued to Green Wallet]
    
    D -->|Doorstep Pickup| G[Smart Geo-Dispatch: Nearest Collector + Mapbox TSP Route - Sharzil F3]
    G --> H[Driver arrives -> OTP Chain-of-Custody Handover - Sadat F4]
    H --> F
    
    F --> I[Trust Gate & Fraud Engine verifies evidence - Sadat F2]
    I --> J[Credits flipped PENDING -> VERIFIED]
    J --> K[MFS Payout to bKash / Nagad - Imran F3]
    J --> L[Carbon Avoidance Ledger & ESG Certificate - Imran F4]
    
    M[Campus / Factory accumulates tonnage] --> N[B2B Bulk Auction: Sealed Reserve + Anti-Snipe - Sharzil F4]
    N --> O[Recyclers place live bids via WebSockets]
    O --> P[Escrow Settlement holds funds until physical inspection - Sadat F3]
```

---

## 2. CSE471 Grading Rubric Alignment Matrix

Each member must deliver **4 unique functional features** (5 marks each = 20 marks total).  
*Rubric Criteria:* **Frontend (1) + Backend/API (1) + Database (1) + Innovation (1) + External Integration (1)**.

### Sharzil Nafis (`m3` — Valuation & Logistics) Scorecard

| Feature | Frontend Surface (1M) | Backend / API Controller (1M) | Database Schema (1M) | Innovation Claim (1M) | External API Integration (1M) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F1: Market-Benchmarked Valuation Engine** *(Retrofit)* | `RateCardScreen.tsx`: Dynamic estimator with live drift indicator badge. | `GET /api/v1/rate-card/estimate`, `CommodityBenchmarkService.ts` | `rate_benchmarks`, `rate_card_entries` with `effective_from` versioning | Continuous FX & global commodity drift calculation (`±10%` threshold) | Open FX Feed (open.er-api) + Global Commodity Market Index |
| **F2: AI Next-Life Scrap Vision Agent** | `VisionScanScreen.tsx`: Camera capture, confidence pill, one-tap listing handoff. | `POST /api/v1/valuation/classify-and-estimate`, `VisionAgentService.ts` | `valuation_scans` table storing AI audit trail & rationale | Regulated E-waste safety gate (forces `RECYCLE`, bypass-proof) + DB pricing join | OpenAI Vision (`gpt-4o-mini`) / Gemini Multimodal API |
| **F3: Smart Geo-Dispatch & Route Optimizer** | `PickupScreen.tsx`: Booking map + Collector ordered SVG stop sequence. | `POST /api/v1/pickups/dispatch/find-best`, `GET /collector-route`, `DispatchService.ts` | `pickup_orders`, `dispatch_assignments`, `partners` fleet columns | Capacity-constrained (`kg`), radius & license-aware nearest neighbor dispatch | Mapbox Directions Matrix API (TSP routing with Haversine fallback) |
| **F4: B2B Bulk Scrap Auction & Live Bidding Engine** | `AuctionsScreen.tsx`: Live lot cards, pulse animation, countdown chips, quick-bid stepper. | `GET/POST /api/v1/auction-lots`, `POST /:id/bids`, `AuctionDomain.ts` | `auction_lots` (sealed reserve), `auction_bids` (monotonic sequence) | Sealed reserve price protection, anti-sniping dynamic clock extensions, lazy close | Pusher Channels (WebSockets for real-time bid tickers) |

> **Banned Feature Defense:**  
> Login/Signup, Role RBAC, and Profile CRUD are treated as shared plumbing (0 marks). Our features focus strictly on domain intelligence, optimization algorithms, and real-time financial mechanisms.

---

## 3. Full System Architecture & Monorepo Design

```
chokro/
├── apps/
│   ├── api/                              # Next.js 16 App Router (REST API + Admin Console)
│   │   ├── app/api/v1/                   # Versioned REST endpoints (pickups, auctions, valuation, etc.)
│   │   ├── lib/
│   │   │   ├── domain/                   # Pure business logic (AuctionDomain, ListingDomain, etc.)
│   │   │   ├── repos/                    # Drizzle ORM data access (seam.ts boundary)
│   │   │   ├── services/                 # External API integrations & algorithms (DispatchService, VisionAgentService, CommodityBenchmarkService)
│   │   │   └── http.ts                   # safeRoute wrapper & CORS error handling
│   │   └── tests/                        # 16 Jest test suites (86 tests) using in-memory PGlite
│   └── mobile/                           # React Native 0.86 + Expo SDK 57 (NativeWind Tailwind v3)
│       └── src/
│           ├── navigation/               # Role-based tabs (roleTabs.ts, AppShell.tsx)
│           ├── screens/                  # Tab screens (VisionScan, Pickup, Auctions, RateCard, etc.)
│           └── services/                 # Axios/Fetch API client + token interceptors
└── packages/
    ├── db/                               # Shared Drizzle PostgreSQL schemas
    └── shared/                           # Universal types, Enums, Zod validation DTOs
```

### Architectural Highlights
1. **Repository Seam Boundary (`withDb`)**: All database operations go through `apps/api/lib/repos/seam.ts`. This allows the entire test suite to run against an in-memory WASM PostgreSQL (`PGlite`) in under 20 seconds with **zero Docker setup**.
2. **Strict Invariant Guard (`packages/shared`)**: Category unit rules are enforced at compile-time and runtime:
   - `APPLIANCES`, `E_WASTE` $\rightarrow$ must use `unit: 'piece'` and provide `piece_count`.
   - `CLOTHES`, `BOOKS`, `PLASTICS`, `PAPER`, `METAL`, `GLASS`, `FURNITURE` $\rightarrow$ must use `unit: 'kg'` and provide `declared_weight`.
3. **Resilient Degradation**: Every external API (OpenAI, Mapbox, Open Commodity & FX Feed, Pusher) has a deterministic in-memory fallback. If API keys are missing or wifi drops during a live presentation, the system **never crashes**.

---

## 4. Database Schema & ERD (M3 Focus)

```mermaid
erDiagram
    users ||--o{ partners : "has profile"
    users ||--o{ listings : "creates"
    users ||--o{ pickup_orders : "requests"
    users ||--o{ valuation_scans : "initiates"
    users ||--o{ auction_bids : "places"
    
    partners ||--o{ pickup_orders : "assigned as collector"
    partners ||--o{ dispatch_assignments : "fulfills stops"
    
    listings ||--o{ pickup_orders : "linked item"
    
    rate_card_entries }|..|{ rate_benchmarks : "market drift comparison"
    
    pickup_orders ||--|| dispatch_assignments : "has route step"
    
    auction_lots ||--o{ auction_bids : "receives"
    users ||--o{ auction_lots : "creates lot"

    rate_benchmarks {
        uuid id PK
        varchar category UK
        varchar commodity_symbol
        decimal global_price_usd
        decimal fx_rate_usd_bdt
        decimal benchmark_bdt
        varchar source
        timestamp updated_at
    }

    valuation_scans {
        uuid id PK
        uuid user_id FK
        text image_url
        varchar detected_category
        varchar detected_condition
        decimal estimated_quantity
        varchar unit
        varchar next_life_path
        boolean is_ewaste_hazard
        decimal confidence
        decimal estimated_value_bdt
        text reasoning_rationale
        text suggested_action
        timestamp created_at
    }

    pickup_orders {
        uuid id PK
        uuid listing_id FK
        uuid customer_id FK
        uuid collector_partner_id FK
        varchar status
        text address
        doublePrecision lat
        doublePrecision lng
        timestamp scheduled_for
        text notes
        timestamp created_at
    }

    dispatch_assignments {
        uuid id PK
        uuid order_id FK
        uuid collector_partner_id FK
        integer stop_sequence
        decimal distance_km
        integer eta_minutes
        timestamp assigned_at
    }

    auction_lots {
        uuid id PK
        varchar title
        varchar category
        decimal quantity_kg
        decimal starting_price_bdt
        decimal reserve_price_bdt "SEALED"
        varchar origin_label
        varchar status
        timestamp opens_at
        timestamp closes_at
        uuid winning_bid_id
        uuid created_by FK
        timestamp created_at
    }

    auction_bids {
        uuid id PK
        uuid lot_id FK
        uuid bidder_user_id FK
        decimal amount_bdt
        integer bid_number "MONOTONIC SEQ"
        timestamp received_at
    }
```

---

## 5. Deep Feature Breakdown, Mechanics & Sequence Diagrams

---

### Feature 1: Market-Benchmarked Valuation Engine (Retrofit)

#### 1. What Problem It Solves
Informal recycling economies (such as scrap markets in Bangladesh) suffer from severe **information asymmetry and market volatility**:
1. **Sellers (Households/Students):** Hesitate to recycle because they fear traditional collectors (*bhangariwallas*) underpay them with arbitrary, opaque pricing.
2. **Platform Operators:** Risk margin collapse if platform collection rates remain fixed while international commodity prices drop.
3. **Recycling Mills:** Need predictable, fair market rates tied to import parity and global spot prices.

The **Market-Benchmarked Valuation Engine** solves this by continuously calculating real-time local scrap valuations (in BDT) dynamically pegged to international commodity indices and live currency exchange rates.

---

#### 2. Systemic Role in the Chokro Ecosystem (The Core Financial Anchor)
Feature 1 does not operate as an isolated CRUD screen; it serves as the platform's central valuation engine:
* **Upstream Anchor for AI Vision (F2):** When the AI Scrap Vision Agent scans an item (e.g. 15 kg scrap metal), it queries `GET /api/v1/rate-card/estimate` to evaluate its exact monetary value in BDT.
* **Economic Prioritization for Geo-Dispatch (F3):** Pickup requests carry declared valuation data so collectors and the route optimization engine can prioritize high-value commercial batches.
* **Floor Price for B2B Auctions (F4):** Aggregators listing multi-ton bulk lots use published benchmarks to calculate fair reserve and starting bid thresholds.
* **Audit Base for Wallets (Imran M4 & Sadat M1):** Because rate cards use versioned `effective_from` timestamps, credit disbursements, escrow payments, and MFS payouts (bKash/Nagad) are anchored to immutable, auditable historical rates.

---

#### 3. 100% Free Public API Architecture & Resilient Fail-Safe
To ensure zero operational cost, no paid subscriptions, and 100% uptime during live evaluations:

```mermaid
flowchart LR
    A[Public Open FX API\nopen.er-api.com] -->|Live USD/BDT Rate\n~122.7 BDT| C[CommodityBenchmarkService]
    B[Public Market Quotes\nYahoo Finance COMEX HG=F/ALI=F] -->|Live Spot Commodity Pricing| C
    C -->|Dynamically Derived Benchmark| D[(rate_benchmarks Table)]
    D -->|Real-time Market Drift ±10%| E[Mobile Rates Tab / Valuation Estimator]
    
    subgraph Multi-Tier Deterministic Fail-Safe
    F[Calibrated In-Memory Spot Baseline] -.->|Timeout / Offline Fallback| C
    end
```

1. **Live Foreign Exchange (USD $\rightarrow$ BDT):**
   - Fetches live currency exchange rates from `https://open.er-api.com/v6/latest/USD` (**100% free, zero API key required**).
2. **Live Commodity Spot Quotes:**
   - Fetches public COMEX metal futures (`HG=F` Copper, `ALI=F` Aluminum) via public chart endpoints.
3. **Deterministic Multi-Tier Fallback:**
   - If internet connectivity drops or an external feed times out (2.5s limit), the service automatically degrades to calibrated baseline commodity rates in memory. The system **never crashes or hangs**.

---

#### 4. The Dynamic Rate Drift Formula & State Machine
The engine continuously assesses whether local platform pricing is competitive, margin-protective, or at risk:

$$\text{Drift \%} = \left( \frac{P_{\text{local}} - P_{\text{benchmark}}}{P_{\text{benchmark}}} \right) \times 100$$

| Drift Percentage | State Classification | UI Badge Rendered | Operational Rationale |
| :--- | :--- | :--- | :--- |
| **$\text{Drift} < -10\%$** | `UNDER_MARKET` | `X% under global index` (Amber) | High platform collection margin; protects operator profitability during market downturns. |
| **$\text{Drift} > +10\%$** | `OVER_MARKET` | `X% above global index` (Purple) | Premium rate offered to incentivize rapid collection during local supply shortages. |
| **$-10\% \le \text{Drift} \le +10\%$** | `IN_SYNC` | `Market aligned (±10%)` (Green) | Fair market equilibrium aligned with international commodity spot rates. |

---

#### 5. Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Client as Mobile Client (Rates Tab)
    participant API as Next.js API (/api/v1/rate-card/estimate)
    participant BenchSvc as CommodityBenchmarkService
    participant ExtAPI as Open FX & Commodity Market Feed
    participant DB as PostgreSQL (rate_benchmarks & rate_card_entries)

    Client->>API: GET /api/v1/rate-card/estimate?category=METAL&condition=GOOD&weight=15
    API->>DB: Fetch latest effective rate card (rateCardRepo.findPublished)
    DB-->>API: Returns active local rate (e.g. ৳110.00 / kg)
    
    API->>BenchSvc: getBenchmarkAndDrift("METAL", 110.00)
    alt Live Open Feeds Available
        BenchSvc->>ExtAPI: GET Open Exchange FX & Market Spot (Timeout 2.5s)
        ExtAPI-->>BenchSvc: Live USD/BDT (~122.70) + Metal Quote
    else Offline / Network Fallback
        BenchSvc->>BenchSvc: Use calibrated baseline ($0.95/kg, 122.50 BDT)
    end
    
    BenchSvc->>BenchSvc: Calculate BDT Benchmark ($0.95 * 122.70 = ৳116.57)
    BenchSvc->>BenchSvc: Calculate Drift ((110 - 116.57) / 116.57 = -5.6%)
    BenchSvc-->>API: Benchmark details { benchmark_bdt: 116.57, drift_pct: -5.6, status: 'IN_SYNC' }
    
    API-->>Client: 200 OK { unit_price: 110.00, quantity: 15, total_bdt: 1650.00, market_benchmark: {...} }
    Client->>Client: Render Bold Green Total (৳1,650) & Market Aligned Badge
```

---

#### 6. Database Schema & Temporal Versioning (`rate_card_entries` & `rate_benchmarks`)
To prevent historical data corruption, rate cards are never destructively overwritten. Instead, they use temporal versioning with `effective_from`:
* **`rate_card_entries`:** `(id, category, condition_band, unit, price_bdt, effective_from, updated_by)`
  * *Query Invariant:* `WHERE effective_from <= NOW() ORDER BY effective_from DESC LIMIT 1`
* **`rate_benchmarks`:** `(id, category, commodity_symbol, global_price_usd, fx_rate_usd_bdt, benchmark_bdt, source, updated_at)`

---

### Feature 2: AI Next-Life Scrap Vision Agent

#### What Problem It Solves
Untrained users don't know whether their scrap is recyclable, repairable, or hazardous e-waste. The Vision Agent acts as an expert multimodal appraiser: it classifies photos into canonical categories, estimates quantity, detects hazardous materials, determines circular next-life paths, and joins with the database rate card to provide an instant financial valuation.

#### Safety & Regulatory Invariant
- **E-Waste Gate:** If the item is classified as `E_WASTE` or electronic hazard, the next-life path is **permanently forced to `RECYCLE`**. The user cannot select `REUSE` or `DONATE` due to Department of Environment (DoE) toxic component regulations.
- **Unit Enforcement:** Appliances and E-Waste output integer piece counts; all other categories output decimal kilograms.

#### Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as User with Mobile App
    participant Screen as VisionScanScreen.tsx
    participant API as POST /api/v1/valuation/classify-and-estimate
    participant VisionSvc as VisionAgentService
    participant LLM as OpenAI GPT-4o-mini (Multimodal Vision)
    participant RateDB as PostgreSQL (rate_card_entries & rate_benchmarks)
    participant ScanDB as PostgreSQL (valuation_scans)
    participant ListScreen as CreateListingScreen.tsx

    User->>Screen: Snaps scrap photo or selects sample
    Screen->>API: POST Base64 image + user notes
    API->>VisionSvc: classifyAndEstimate(input)
    
    alt OpenAI Key Configured
        VisionSvc->>LLM: Multimodal JSON completion (image + strict system prompt)
        LLM-->>VisionSvc: { category: "METAL", condition: "GOOD", confidence: 0.94 }
    else Fallback Classifier
        VisionSvc->>VisionSvc: Run deterministic heuristic feature extractor
    end
    
    VisionSvc->>VisionSvc: Invariant check (unit = kg, piece = null)
    VisionSvc->>VisionSvc: Evaluate Next-Life Path (METAL + GOOD -> RECYCLE)
    
    VisionSvc->>RateDB: Query published rate card for METAL @ GOOD
    RateDB-->>VisionSvc: 110 BDT/kg
    
    VisionSvc->>ScanDB: Persist audit record into valuation_scans table
    ScanDB-->>VisionSvc: Stamped record with UUID
    
    VisionSvc-->>API: Complete valuation result
    API-->>Screen: 200 OK { scan_id, classification, valuation, recommendation }
    Screen->>Screen: Display Confidence Pill, Rationale & Estimated Value
    
    User->>Screen: Clicks "List this Scrap"
    Screen->>ListScreen: Navigate with prefilled category, unit, weight & photo
    ListScreen->>ListScreen: Form auto-populated and validated ready for 1-tap submit
```

---

### Feature 3: Smart Geo-Dispatch & Route Optimizer

#### What Problem It Solves
Individual scrap collections fail when drivers are sent to pickups without checking vehicle capacity, without checking required hazardous material licenses, or without optimizing driving routes across Dhaka traffic.

#### The 4-Step Dispatch Algorithm
1. **Candidate Filtering:** Queries all `partners` where `status = 'VERIFIED'` and `types` contains `'COLLECTOR'`.
2. **Constraint Enforcement:**
   - *License Check:* If scrap category is `E_WASTE`, collector **must** have `e_waste_licensed = true`.
   - *Geofence Radius:* $\text{HaversineDistance}(\text{Driver Base}, \text{Pickup}) \le \text{Driver Service Radius}$ (e.g. 10 km).
   - *Capacity Constraint:* $\text{Driver Remaining Capacity} \ge \text{Pickup Weight}$, where:
     $$\text{Remaining Capacity} = \text{Vehicle Capacity} - \sum(\text{Active Assigned Order Weights})$$
3. **Winner Selection:** Shortest distance driver is awarded the assignment.
4. **Mapbox Matrix Route Optimization (TSP):**
   - Coordinates (Driver Base + all active pickup stops) are sent to **Mapbox Directions Matrix API**.
   - Solves the Traveling Salesperson Problem (TSP) using a greedy nearest-neighbor walk over the duration/distance cost matrix.
   - Calculates cumulative ETAs and ordered stop sequences ($1, 2, 3 \dots$).
   - *Fallback:* If Mapbox is unreachable, computes an internal mathematical Haversine distance matrix at an average speed of $25\text{ km/h}$.

#### Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Individual User
    participant Mobile as PickupScreen (Booking Mode)
    participant API as POST /api/v1/pickups
    participant Dispatch as DispatchService
    participant DB as PostgreSQL (partners, pickup_orders, dispatch_assignments)
    participant Mapbox as Mapbox Matrix API
    actor Collector as Collector Driver (Mobile App)

    Customer->>Mobile: Selects location, date & submits pickup booking
    Mobile->>API: POST /api/v1/pickups { listing_id, lat, lng, address, scheduled_for }
    API->>Dispatch: assignBestCollector(params)
    
    Dispatch->>DB: Query verified collectors with vehicle capacity
    DB-->>Dispatch: List of candidate partner fleets
    
    Dispatch->>Dispatch: Filter: within radius + remaining capacity >= weight + license check
    Dispatch->>Dispatch: Rank by Haversine distance -> Selects nearest eligible driver
    
    Dispatch->>DB: Insert pickup_orders row (status: ASSIGNED)
    Dispatch->>DB: Insert dispatch_assignments row (stop_sequence: N)
    API-->>Mobile: 201 Created { order_id, collector: { org_name, vehicle_label }, eta_minutes }
    
    Note over Collector, DB: Collector opens App (Switches to Collector Persona)
    Collector->>API: GET /api/v1/pickups/collector-route
    API->>Dispatch: optimizeRoute(collectorPartnerId)
    Dispatch->>DB: Fetch driver base coords + all active pickup stops
    
    alt Mapbox Token Active
        Dispatch->>Mapbox: GET /directions-matrix/v1/mapbox/driving (coords list)
        Mapbox-->>Dispatch: Real duration & distance matrix
    else Network / Token Fallback
        Dispatch->>Dispatch: Compute Haversine matrix @ 25 km/h
    end
    
    Dispatch->>Dispatch: Run nearest-neighbor TSP walk -> Order stops from base
    Dispatch-->>API: { routing_source: 'mapbox', stops: [ordered stops with cumulative ETAs] }
    API-->>Collector: Render SVG Stop Sequence, addresses, material info & ETAs
```

---

### Feature 4: B2B Bulk Scrap Auction & Live Bidding Engine

#### What Problem It Solves
Institutions and factories accumulating tons of scrap waste need competitive market pricing. Standard marketplace listings are slow and prone to underbidding. Chokro's B2B Auction platform enables recyclers to compete in live, high-frequency bidding events with strict financial and anti-collusion integrity rules.

#### Key Invariants & Financial Protections
1. **Sealed Reserve Price:** The seller's reserve price ($P_{\text{reserve}}$) is stored in the database but **never serialized to API responses**. Bidders only see `reserve_met: boolean`.
2. **Anti-Snipe Protection:** If a valid bid is placed in the final **2 minutes** before closing, the auction clock is automatically extended by an additional 2 minutes, preventing bot sniping.
3. **Server-Authoritative Monotonic Bidding:** Bids are assigned sequential `bid_number` values ($1, 2, 3\dots$) on the database layer. A bid is only valid if the server records it first.
4. **Minimum Increment Rule:** Every new bid must be at least $\mathbf{+৳50}$ higher than the current highest bid.
5. **Lazy Close:** Whenever a lot is requested after its closing timestamp, the server lazily updates the status to `ENDED` and stamps the winning bid if reserve was met.

#### Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Recycler as Recycler Bidder
    participant Screen as AuctionsScreen.tsx (Recycler Persona)
    participant API as POST /api/v1/auction-lots/:id/bids
    participant Domain as AuctionDomain.ts
    participant DB as PostgreSQL (auction_lots & auction_bids)
    participant Pusher as Pusher Channels (WebSockets)
    actor OtherBidders as Other Connected Recyclers

    Screen->>API: POST /api/v1/auction-lots/{id}/bids { amount: 65200 }
    API->>Domain: placeBid({ lotId, bidderUserId, amount })
    
    Domain->>DB: Fetch lot by ID (runs closeIfExpired check)
    DB-->>Domain: Lot details (status: LIVE, closes_at: T)
    
    Domain->>DB: Find highest existing bid
    DB-->>Domain: Highest bid = 65000 BDT
    
    Domain->>Domain: Validate amount >= 65000 + 50 (Valid!)
    
    opt Time remaining < 2 minutes (Anti-Snipe Trigger)
        Domain->>DB: Update lot: closes_at = now() + 2 minutes
    end
    
    Domain->>DB: Insert auction_bids (monotonic bid_number = highest + 1)
    DB-->>Domain: Bid saved successfully
    
    Domain->>Pusher: Trigger event 'new-bid' on channel 'auction-lot-{id}'
    Pusher-->>OtherBidders: Broadcast { current_price: 65200, bid_number: 14, bidder: "Dhaka Recyclers" }
    OtherBidders->>OtherBidders: Live ticker updates & green pulse animation triggers
    
    Domain-->>API: Return public lot (sealed reserve stripped) + public bid
    API-->>Screen: 201 Created { bid, lot }
    Screen->>Screen: Show "Bid Placed!" feedback toast
```

---

## 6. Cross-Team Dependencies & How to Defend Them to Your Teacher

When presenting, teachers frequently ask questions about cross-team collaboration, module boundaries, and what happens if another member's code is not running. 

Here is the exact architectural defense:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CHOKRO SYSTEM SEAMS                             │
├───────────────────────┬─────────────────────────┬───────────────────────────┤
│ Team Member / Module  │ Integration Point (Seam)│ Your Invariant & Handling │
├───────────────────────┼─────────────────────────┼───────────────────────────┤
│ m1: Sadat             │ partners table          │ F3 Dispatch checks:       │
│ (Trust & KYC)         │ (status, types,         │ - partner.status == VERIFIED│
│                       │  e_waste_licensed)      │ - partner.types includes  │
│                       │                         │   "COLLECTOR"             │
│                       │                         │ - e_waste_licensed == true│
├───────────────────────┼─────────────────────────┼───────────────────────────┤
│ m2: Sameer            │ listings table &        │ F2 AI Vision classifies   │
│ (Marketplace)         │ CreateListing form      │ and passes prefill DTO    │
│                       │                         │ directly into Sameer's    │
│                       │                         │ listing creation form.    │
├───────────────────────┼─────────────────────────┼───────────────────────────┤
│ m4: Imran             │ rate_card_entries &     │ F1 Valuation Engine       │
│ (Drop Zones & Wallet) │ rate_benchmarks         │ publishes the pricing API │
│                       │                         │ that Imran's Smart Bins   │
│                       │                         │ use to calculate credits. │
└───────────────────────┴─────────────────────────┴───────────────────────────┘
```

### Verbal Viva Q&A Script for Teacher Scrutiny

#### Q1: "What if Sadat's partner KYC module is down or unapproved? How does your Geo-Dispatch work?"
> **Answer:** *"Our system is designed with strict domain seams using the Repository Pattern. My `DispatchService` queries the database contracts directly. During independent evaluation, my seed script (`pnpm db:setup`) seeds pre-verified partner collectors with valid vehicles and licenses. When Sadat's module is active, his KYC approval process directly updates the `e_waste_licensed` flag in the same database table, seamlessly feeding into my capacity and routing algorithm."*

#### Q2: "How does your AI Vision Agent connect to Sameer's Marketplace?"
> **Answer:** *"My Vision Agent accepts raw camera captures, extracts material properties, validates unit invariants (kg vs piece), and joins with our live database rate card. Once evaluated, it outputs a standardized `ListingPrefill` DTO. Clicking 'List this Scrap' hands off this DTO directly into the `CreateListingScreen`, pre-populating category, condition, estimated weight, and photos with zero duplicate data entry."*

#### Q3: "What if external APIs like OpenAI, Mapbox, or Pusher fail or rate-limit during the evaluation?"
> **Answer:** *"Every single external integration has a deterministic, in-engine fallback:
> 1. **OpenAI Vision:** Falls back to an internal heuristic rule-based classifier that extracts category and condition while preserving all domain invariants and rate-card joins.
> 2. **Mapbox Matrix:** Falls back to an internal mathematical Haversine distance matrix with nearest-neighbor TSP sequencing at 25 km/h city speed.
> 3. **Pusher Realtime:** The mobile app automatically activates a 4-second background polling cycle if WebSockets are unavailable.
> 4. **Commodity & FX Feed:** Falls back to calibrated baseline commodity spot rates. The system never crashes."*

#### Q4: "Why not just use a static database price table? Why build a dynamic benchmark engine with drift calculation?"
> **Answer:** *"Static pricing tables suffer from two fatal flaws in circular economies:
> 1. **Trust Deficit:** Users don't trust static numbers, suspecting the platform underpays them compared to market rates.
> 2. **Margin Vulnerability:** If global copper or polymer prices drop by 20%, a platform paying fixed rates suffers immediate margin collapse.
>
> Our engine continuously benchmarks local rate card prices against live international commodity quotes and real-time USD/BDT FX rates from free open feeds. It calculates percentage drift (`UNDER_MARKET`, `OVER_MARKET`, `IN_SYNC`), displaying dynamic transparent badges for users while warning platform operators when local rates drift out of alignment. Furthermore, our `effective_from` temporal versioning guarantees complete auditability for all wallet payouts and escrows without destructive overwrites."*

---

## 7. Role-Based Navigation & Persona Switcher Guide

To make grading effortless for your professor, the mobile app includes a **Role-Based Navigation System** and an active **Persona Chip**:

```
Role Tabs Mapping:
├── Individual: [ Browse | List | AI Scan | Pickup | Rates | Wallet | Scan ]
├── Collector:  [ Pickup (Route Map) | Browse | Rates | Wallet | Scan ]
├── Recycler:   [ Auctions (Live Bidding) | Pickup | Browse | Rates | Wallet ]
└── Admin:      [ Browse | Rates | Wallet ] + Web Console (/admin)
```

### How to Switch Roles Live
In the top navigation bar, the active persona badge is displayed (`Individual`, `Collector`, `Recycler`, `Admin`).
1. Sign out by tapping the logout icon in the top right.
2. Sign in with the desired demo account:
   - **Individual Demo:** `demo@chokro.com` / `Password123!`
   - **Collector Driver Demo:** `green.collector@chokro.com` / `Password123!`
   - **Recycler Bidder Demo:** `dhaka.recyclers@chokro.com` / `Password123!`
   - **Admin Demo:** `admin@chokro.com` / `Password123!`

---

## 8. Live Teacher Demonstration Script & Viva Defense (CO5 Preparation)

Follow this **4-minute step-by-step walkthrough** to showcase full marks across all 4 features:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CHOKRO 4-MINUTE DEMO SCRIPT                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Rates Tab (Feature 1 - Valuation & Drift)                                │
│    - Open "Rates" tab.                                                      │
│    - Select "METAL" and condition "GOOD". Adjust quantity slider to 15 kg.  │
│    - Point out: Unit price (৳110/kg), total valuation (৳1,650), and the     │
│      drift badge ("Market aligned" / "12% under global index").             │
│                                                                             │
│ 2. AI Scan Tab (Feature 2 - AI Scrap Vision Agent)                          │
│    - Open "AI Scan" tab.                                                    │
│    - Tap the "E-Waste / Phone" sample chip or take a photo.                 │
│    - Tap "Analyze & Appraise Scrap".                                        │
│    - Point out: 94% confidence, automatic unit switch to 'piece', forced   │
│      'RECYCLE' safety path (non-overridable), and database pricing join.    │
│    - Tap "List this Scrap" -> Shows instant prefill in Create Listing form. │
│                                                                             │
│ 3. Pickup Tab (Feature 3 - Geo-Dispatch & Route Optimizer)                  │
│    - In Individual mode, book a pickup for the listed item.                 │
│    - Point out: Instant collector assignment ("Green Fleet Dispatch").      │
│    - Switch user to Collector: sign in as green.collector@chokro.com.       │
│    - Open "Pickup" tab -> Point out the ordered SVG stop graph, cumulative  │
│      driving ETAs, and Mapbox TSP route optimization.                       │
│                                                                             │
│ 4. Auctions Tab (Feature 4 - B2B Auction & Live Bidding)                    │
│    - Switch user to Recycler: sign in as dhaka.recyclers@chokro.com.        │
│    - Open "Auctions" tab -> Point out live countdown timer & sealed reserve.│
│    - Tap "+৳500" quick-bid button -> Watch the live pulse animation,        │
│      monotonic bid sequence number update, and WebSocket broadcast.         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Live Modification Viva (CO5) — Anticipated Teacher Requests

Teachers will ask you to change code live on the spot to prove authorship. Here are the exact locations:

| Teacher's Live Challenge | File to Modify | Lines / Exact Change |
| :--- | :--- | :--- |
| **"Change the minimum bid increment from ৳50 to ৳100"** | `apps/api/lib/domain/AuctionDomain.ts` | Change line 13: `export const MIN_BID_INCREMENT_BDT = 100;` |
| **"Change the anti-snipe extension time from 2 mins to 5 mins"** | `apps/api/lib/domain/AuctionDomain.ts` | Change line 15: `export const ANTI_SNIPE_WINDOW_MS = 5 * 60 * 1000;` |
| **"Change the market drift alert threshold from 10% to 15%"** | `apps/api/lib/services/CommodityBenchmarkService.ts` | In `calculateDrift()`: Change `if (driftPct < -15)` and `else if (driftPct > 15)` |
| **"Make books and clothes use piece count instead of kg"** | `packages/shared/src/rules/categories.ts` | Move `'BOOKS'` and `'CLOTHES'` from `WEIGHT_CATEGORIES` to `PIECE_CATEGORIES` |
| **"Change the default vehicle driving speed from 25 km/h to 30 km/h"**| `apps/api/lib/services/DispatchService.ts` | Change line 5: `const FALLBACK_AVG_SPEED_KMH = 30;` |

---

## 9. Assignment 03: API & Postman Catalog

For Assignment 03, the server can be started on your custom student port using:
```bash
PORT=4589 pnpm --filter @chokro/api dev
```
*(Replace `4589` with the last 4 digits of your Student ID).*

### Documented REST Endpoints

#### 1. Valuation & Estimator (Feature 1)
- **`GET /api/v1/rate-card/estimate`**
  - Query Params: `category=METAL`, `condition=GOOD`, `weight=10.5`
  - Response: `{ unit_price_bdt: 110, total_estimated_bdt: 1155, benchmark_bdt: 116.38, drift_pct: -1.2, drift_status: "IN_SYNC" }`

#### 2. AI Vision Classification (Feature 2)
- **`POST /api/v1/valuation/classify-and-estimate`**
  - Headers: `Authorization: Bearer <JWT>`, `Content-Type: application/json`
  - Body: `{ "imageBase64": "data:image/jpeg;base64,...", "promptNotes": "Old copper wires" }`
  - Response: `{ "scan_id": "...", "classification": { "category": "METAL", "confidence": 0.94 }, "valuation": { "total_estimated_bdt": 1100 } }`

#### 3. Smart Dispatch & Pickup (Feature 3)
- **`POST /api/v1/pickups/dispatch/find-best`**
  - Body: `{ "lat": 23.7937, "lng": 90.4066, "category": "METAL", "weightKg": 15.0 }`
  - Response: `{ "best": { "partner": { "org_name": "Green Dhaka Logistics" }, "distance_km": 1.84, "remaining_capacity_kg": 485.0 } }`
- **`GET /api/v1/pickups/collector-route`**
  - Headers: `Authorization: Bearer <COLLECTOR_JWT>`
  - Response: `{ "routing_source": "mapbox", "stops": [...] }`

#### 4. B2B Auctions & Realtime Bids (Feature 4)
- **`GET /api/v1/auction-lots`**
  - Response: `[ { "id": "...", "title": "500kg Industrial Copper", "current_price_bdt": 65000, "reserve_met": true, "bid_count": 12 } ]`
- **`POST /api/v1/auction-lots/:id/bids`**
  - Body: `{ "amount": 65500 }`
  - Response: `{ "bid": { "bid_number": 13, "amount_bdt": 65500 }, "lot": { "current_price_bdt": 65500 } }`

---

## 10. Summary & Checklist for Presentation Day
- [x] Run `pnpm test` to demonstrate **16 passing test suites (86 tests)**.
- [x] Launch both backend and mobile with `pnpm dev`.
- [x] Open mobile app in Expo Go or Simulator.
- [x] Demonstrate all 4 features using the Persona Chip.
- [x] Keep this guide open for quick reference during viva questioning.
