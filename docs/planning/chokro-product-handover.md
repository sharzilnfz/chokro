# Chokro (চক্র) — Product Pivot & Team Alignment Guide

> **Ecosystem Mission:** An AI-Powered Circular Economy, Scrap Valuation & Hyperlocal Reverse Logistics Network for Dhaka.

---

## 1. What is Chokro? (The Unified Pitch)

Dhaka produces thousands of tons of recyclable scrap daily, but the informal recycling chain is broken:
* **Households & Campuses** get arbitrary, low-ball prices because they don't know the real market value of their scrap.
* **Informal Collectors (Van-walas / Tokais)** wander streets aimlessly without optimized pickup routes or guaranteed inventory.
* **Industrial Recyclers & Mills** starve for consistent, high-purity raw feedstock (metals, PET plastics, e-waste).

**Chokro** connects these dots into a closed-loop digital ecosystem:
1. **Households & Students** scan items with AI to get instant valuations and either drop them at smart campus bins or book doorstep pickups.
2. **Collectors** receive optimized route dispatches to pick up verified loads.
3. **Recycling Plants** bid on bulk scrap lots through B2B industrial auctions.

```
[ Household / Campus / Factory ]
              │
              ├── (1) AI Photo Scan ──────► [ AI Next-Life Vision Agent ] (Auto-Valuation)
              │
              ├── (2) Book Pickup ────────► [ Smart Geo-Dispatch Engine ] (Collector Routing)
              │
              ├── (3) Drop at Campus ─────► [ QR Smart Drop-Zone Hub ]   (Physical Weight Scale)
              │
              └── (4) Industrial Bulk ────► [ B2B Live Auction Engine ]   (Recycler Bidding)
```

---

## 2. Why We Are Upgrading: Before vs. Now

We are evolving the project from a simple classifieds app into a high-scoring engineering project that impresses examiners.

| Area | What We Had in Sprint 1 | What We Are Building Now |
| :--- | :--- | :--- |
| **Product Concept** | Basic listing board for second-hand scrap. | Full-scale Circular Scrap Trading & Reverse Logistics Platform. |
| **Pricing & Logic** | Static admin table with fixed values. | AI Vision scan + live dynamic commodity pricing. |
| **Logistics** | Manual user meetups or unguided visits. | Route-optimized collector dispatches and geofenced smart bins. |
| **Target Users** | C2C household junk only. | C2B (Households/Campuses) + B2B (Industrial Recyclers). |
| **Grading Safety** | High risk of lost marks due to simple CRUD. | High-scoring marks across AI, Maps, WebSockets, and FinTech. |

---

## 3. CSE471 Grading Rules & Constraints (Must Follow)

Every team member must strictly meet these requirements to secure full marks:

1. **4 Features Per Member:**
   * **Module 1 (Lab 5):** 1st Feature (Retroactively refined / defended)
   * **Module 2 (Lab 6):** 2nd Feature
   * **Module 3 (Lab 7):** 3rd & 4th Features
2. **5 Marks Per Feature Breakdown (20 Total):**
   * Frontend (1) + Backend API (1) + Database (1) + Innovation (1) + External API (1).
3. **Banned as Standalone Features (Scaffolding Only):**
   * ❌ Login / Signup / JWT / OAuth / Logout
   * ❌ User Profile Management
   * ❌ Role Management / Basic RBAC
   * ❌ Generic Admin Settings / Boilerplate
4. **Mandatory Tech:**
   * Real PostgreSQL + Drizzle ORM CRUD operations (Hardcoding = 0 marks).
   * **At least 1 external third-party API per member** (OpenAI, Google Maps, Pusher, Twilio, bKash, Cloudinary, etc.).
   * Live code modification viva (CO5): You must be able to change UI, API, and DB live during the exam.

---

## 4. Locked Baseline: Sprint 1 (What We Keep As-Is)

We do **not** discard or redo our Sprint 1 work. We build directly on top of it:

* **`m1` Sadat:** Enterprise Partner Verification & KYC Application (`TA2`)
* **`m2` Sameer:** Multi-Category Scrap Listing Engine (`TB1`)
* **`m3` Sharzil (User):** Scrap Rate-Card Console & Benchmark Valuation Engine (`TC1`)
* **`m4` Imran:** Campus/Ward Drop-Zone Hub Management (`TD2`)

---

## 5. Sharzil's (`m3`) Locked Feature Roadmap

Sharzil is locking the following 4 features across the sprints:

* **Sprint 1 (Done):** Rate-Card Console & Valuation Benchmark Engine (`rate_card_entries`).
* **Sprint 2 (Lab 6):** **AI Next-Life Scrap Vision Agent & Classifier**  
  *User uploads photo $\rightarrow$ OpenAI Vision identifies material, condition, and estimated weight $\rightarrow$ Queries DB rate-card $\rightarrow$ Computes instant cash quote + reuse/recycle advice.*  
  *External API: OpenAI Vision API (`gpt-4o-mini`).*
* **Sprint 3 (Lab 7) — Feature 3:** **Smart Geo-Dispatch & Route Optimizer**  
  *On-demand scrap collector dispatch scheduler with vehicle capacity constraints and shortest-path navigation.*  
  *External API: Mapbox / Google Maps Distance Matrix API.*
* **Sprint 3 (Lab 7) — Feature 4:** **B2B Bulk Scrap Auction & Live Bidding Engine**  
  *High-volume industrial scrap auctions (factories selling tons of e-waste/metal) with real-time bidding countdowns.*  
  *External API: Pusher / WebSockets.*

---

## 6. Teammate Feature Menu (Choose 3 Features for Sprint 2 & 3)

Sadat, Sameer, and Imran: Pick **1 feature for Sprint 2** and **2 features for Sprint 3** from this menu to pair with your Sprint 1 work. Every feature includes a dedicated external API and full-stack DB persistence.

### Group A: Drop-Zone & Physical Operations
* **Option 1: Smart QR Dynamic Deposit & Weight Scale Gate**
  * *Concept:* Generates secure time-limited TOTP session when user scans a drop-zone bin; records net weight verification.
  * *External API:* TOTP / Cryptographic Token Hash Generator.
  * *DB:* `drop_sessions`, `deposit_records`.

* **Option 2: Drop-Zone Anomaly & Weight Fraud Detector**
  * *Concept:* Monitors deposit frequency and weight limits; flags suspicious drops for staff audit.
  * *External API:* Discord / Telegram Alert Webhook.
  * *DB:* `fraud_flags`, `audit_inspectors`.

---

### Group B: Payments, FinTech & Compliance
* **Option 3: Digital Waste-to-Cash Wallet & MFS Payout Engine**
  * *Concept:* Converts recycled kilograms into green wallet balance; supports automated withdrawal requests to bKash/Nagad.
  * *External API:* SSLCommerz / bKash Merchant Sandbox API.
  * *DB:* `credit_txns`, `payout_requests`, `wallet_balances`.

* **Option 4: Escrow Settlement & Quality Dispute Arbitration Gate**
  * *Concept:* Locks transaction funds in escrow until scrap inspection passes; handles mismatch disputes with photo evidence.
  * *External API:* Resend / SendGrid Webhook.
  * *DB:* `dispute_tickets`, `escrow_holds`.

---

### Group C: Marketplace & Real-Time Trading
* **Option 5: Hyperlocal Geo-Discovery & Radius Filter Feed**
  * *Concept:* Map view and feed showing scrap listings within 1km–10km of the user's Thana/Ward with category facets.
  * *External API:* OpenStreetMap Nominatim / Leaflet.
  * *DB:* Geolocation spatial coordinates on `listings`.

* **Option 6: Recycler "Wanted Scrap" Request Board (Reverse Marketplace)**
  * *Concept:* Factories and recyclers post scrap buying demands (e.g., "Need 500kg Copper"); sellers match and fulfill orders.
  * *External API:* OneSignal Push Notification API.
  * *DB:* `buyer_demands`, `demand_matches`.

* **Option 7: In-App Price Negotiation & Counter-Offer Chat**
  * *Concept:* Real-time buyer-seller bargaining with a binding counter-offer state machine.
  * *External API:* Stream Chat API / Ably Realtime.
  * *DB:* `negotiation_threads`, `negotiation_offers`.

---

### Group D: Sustainability, Gamification & Market Intel
* **Option 8: LCA Carbon Avoidance Calculator & ESG Certificate Generator**
  * *Concept:* Calculates $CO_2e$ emissions and water saved based on mass recycled; generates verifiable PDF green certificates.
  * *External API:* PDFKit / Puppeteer PDF Generator.
  * *DB:* `impact_audits`, `sustainability_certificates`.

* **Option 9: Scrap Commodity Rate Trends & SMS Price Spike Alerts**
  * *Concept:* Real-time scrap commodity price charts with automated SMS alerts when market rates surge.
  * *External API:* Twilio SMS API.
  * *DB:* `rate_history`, `price_alert_subscriptions`.

* **Option 10: Inter-Campus Green Circularity Leaderboard & Badges**
  * *Concept:* University recycling rankings with streak multipliers and shareable social badge images.
  * *External API:* OpenGraph Dynamic Badge Image Generator.
  * *DB:* `campus_leaderboards`, `user_streaks`, `badge_awards`.

---

## 7. Immediate Next Step: Assignment 03 (Postman Collection)

* Every student must document **2 REST APIs** in Postman running on their custom port (**`http://localhost:<LAST_4_DIGITS_OF_ID>`**).
* For Sharzil (`m3`), the 2 endpoints for Assignment 03 are:
  1. `GET /api/v1/rate-card/estimate` (Valuation Benchmark)
  2. `POST /api/v1/valuation/classify-and-estimate` (AI Vision Scrap Classifier)
* Each teammate will pick their 2 features to set up their own Postman collections on their individual ports.
