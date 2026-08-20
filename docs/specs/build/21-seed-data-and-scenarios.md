# SPEC 21 — Comprehensive Demo Seed Data & Scenario Matrix

**Status:** build spec  
**Purpose:** Resolves Gap 3 (Complete seed dataset for ~25 tables guaranteeing zero empty screens)  
**Depends on:** SPECs 10–20 (all database schemas, relationships, and state machines)  
**Blocks:** End-to-end demo execution and evaluation readiness  

---

## 1. The "Zero Empty Screens" Invariant

The CSE471 grading standard requires that an examiner navigating to any screen during a live evaluation sees an authentic, active, mid-lifecycle system — never blank tables, placeholder strings, or "No records found".

To achieve this, `packages/db/src/seed.ts` is upgraded with a **Dynamic Relative Time Engine**:
- Active auctions, open deposit sessions, pending counter-offers, and verification queues use relative offsets (`new Date(Date.now() + 10 * 60 * 1000)`) instead of static hardcoded dates.
- Re-running `pnpm db:seed` guarantees the database is primed with active, countdown-ticking records ready for demonstration.

---

## 2. Table-by-Table Seed Inventory (~25 Tables)

### A. Identity, Campuses & Fleet
1. **`users` (6 Seed Records):**
   - `admin@chokro.com` (Role: `ADMIN`)
   - `student1@bracu.ac.bd` (Role: `INDIVIDUAL`, Campus: `brac-univ`, Balance: 450 Verified, 120 Pending)
   - `student2@du.ac.bd` (Role: `INDIVIDUAL`, Campus: `univ-dhaka`, Balance: 850 Verified)
   - `collector_korim@bengalrecycle.com` (Role: `PARTNER`, Fleet: 800kg Van)
   - `recycler_rahim@dhakascrap.com` (Role: `PARTNER`, DoE Licensed E-Waste Recycler)
   - `buyer_faruk@metals.com` (Role: `INDIVIDUAL`, Bulk Scrap Trader)
2. **`campuses` (4 Records):**
   - BRAC University (Kha-224, Bir Uttam Rafiqul Islam Ave, Merul Badda, Dhaka)
   - University of Dhaka (Nilkhet Rd, Dhaka)
   - BUET (Palashi, Dhaka)
   - North South University (Bashundhara, Dhaka)
3. **`partners` (3 Records):**
   - *Bengal Circular Logistics:* Types: `["COLLECTOR"]`, vehicle capacity: 800kg, base: Badda, radius: 12km.
   - *Dhaka Green Recyclers:* Types: `["RECYCLER", "COLLECTOR"]`, `e_waste_licensed: true`, DoE Permit: `DOE/E-WASTE/2024/091`.
   - *ElectroFix Workshop:* Types: `["REPAIR_SHOP"]`, capability: `{ repairs: true, buys: true }`.

### B. Valuation, Marketplace & Media
4. **`rate_card_entries` (18 Records):** Full matrix across all 9 categories (`CLOTHES`, `BOOKS`, `PLASTICS`, `PAPER`, `METAL`, `GLASS`, `FURNITURE`, `APPLIANCES`, `E_WASTE`) and condition bands (`LIKE_NEW`, `GOOD`, `FAIR`, `SCRAP_ONLY`).
5. **`rate_benchmarks` (4 Records):** Global commodity benchmark link for Copper (৳780/kg), Aluminium (৳220/kg), PET Plastic (৳45/kg), Paper (৳28/kg).
6. **`listings` & `listing_media` (8 Records):**
   - 40kg Sorted Copper Wire (Tejgaon, ৳720/kg, Privacy-stripped photos)
   - 120kg Industrial Cardboard Boxes (Mirpur, ৳25/kg)
   - Defective Microwave Oven (Dhanmondi, 1 piece, Fair condition, ৳1,400)
   - Mixed Circuit Boards & Motherboards (Gulshan, E-Waste, 8 pieces, ৳3,200)

### C. Drop Zones, Telemetry & Sessions
7. **`drop_zones` (3 Records):**
   - *BRACU Building 1 Cafeteria Bin* (Accepted: `PLASTICS`, `PAPER`, `METAL`)
   - *BUET Civil Dept Green Hub* (Accepted: `PLASTICS`, `E_WASTE`, `PAPER`)
   - *NSU Student Lounge Drop Point* (Accepted: `PLASTICS`, `BOOKS`)
8. **`zone_capacity_logs` (6 Records):** Historical logs showing fill rates (45%, 68%, 88% overflow alert).
9. **`drop_sessions` & `deposit_records` (4 Records):**
   - 1 active open session (expires in 12 minutes).
   - 2 completed deposits with evidence photos and pending credits.

### D. Trust Gate, KYC & Disputes
10. **`kyc_extractions` (2 Records):**
    - 1 verified DoE E-Waste license extraction.
    - 1 flagged extraction with mismatched trade license number awaiting admin queue review.
11. **`verification_decisions` & `fraud_flags` (5 Records):**
    - 3 `AUTO_CLEAR` decisions tracing to verified credits.
    - 1 `ESCALATE` decision on duplicate photo pHash detection.
    - 1 `ESCALATE` decision on mandatory E-Waste human review.
12. **`escrow_holds` & `dispute_tickets` (2 Records):**
    - 1 active escrow hold (৳48,000) for bulk aluminium auction lot.
    - 1 open dispute ticket with buyer and seller photos over contaminated scrap.

### E. Logistics, Reverse Demands & Settlement
13. **`pickup_orders` & `dispatch_assignments` (3 Records):**
    - 1 assigned pickup task en-route to Dhanmondi with ordered stop sequence.
14. **`custody_handovers` & `otp_challenges` (2 Records):**
    - 1 active 6-digit OTP challenge (`384912`) ready for live handover demonstration.
15. **`buyer_demands` & `demand_matches` (3 Records):**
    - Recycler Rahim's standing demand for 500kg Copper in Tejgaon.
    - 2 auto-generated match rows.
16. **`negotiation_threads` & `negotiation_offers` (2 Records):**
    - Active bilateral bargaining thread on 40kg copper listing: Offer ৳700 $\to$ Counter-offer ৳740 with 18 hours remaining.
17. **`credit_txns`, `payout_requests` & `payout_events` (8 Records):**
    - Completed `EARN` credits, active `REDEEM` request (৳500 to bKash), and settled MFS payout logs.

### F. Institutional Impact & Gamification
18. **`impact_audits` & `sustainability_certificates` (4 Records):**
    - Audited mass records totaling 1,420kg diverted scrap.
    - Official BRAC University Sustainability Certificate (Ref: `CERT-BRACU-2026-Q1`) signed with SHA-256 hash.
19. **`badge_awards` & `campus_leaderboards` (12 Records):**
    - Badges: `FIRST_VERIFIED_DROP`, `10KG_DIVERTED`, `E_WASTE_CHAMPION`.
    - Materialized weekly leaderboard rankings for BRACU, DU, BUET, and NSU.

---

## 3. Seven Concrete Mid-Lifecycle Live Demo Scenarios

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          SEEDED MID-LIFECYCLE DEMO SCENARIOS                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. LIVE AUCTION (Lot #101):                                                            │
│    • 500kg Mixed Copper Cables • Starting: ৳280,000 • Reserve: ৳320,000 (MET)          │
│    • 4 competing bids placed • Closes in: 08m 42s • Live countdown ticking             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. PENDING DEPOSIT & WALLET:                                                           │
│    • Student deposited 4.2kg PET bottles at BRACU Zone • Credit: ৳189.00 (PENDING)     │
│    • Awaiting collector scale confirmation during bin emptying                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. TRUST GATE ESCALATION WORKLIST:                                                     │
│    • Item #E-891: Broken UPS Battery (E-Waste) flagged: [E_WASTE_MANDATORY_REVIEW]     │
│    • Item #D-402: Paper deposit flagged: [PHASH_DUPLICATE_IMAGE_DETECTED]              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. REAL-TIME COUNTER-OFFER NEGOTIATION:                                                │
│    • Buyer Faruk offers ৳700/kg • Seller counters with ৳740/kg • 18 hours left         │
│    • One tap "Accept" will atomically lock listing and spawn pickup task               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 5. REVERSE DEMAND AUTO-MATCH:                                                          │
│    • Recycler Rahim's demand for 500kg Copper has 2 new matched listings in Tejgaon   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 6. PARTNER KYC OCR ADJUDICATION:                                                       │
│    • Bengal Recyclers submitted DoE certificate • OCR extracted license & expiry       │
│    • Ready for admin one-tap "Grant E-Waste Capability" approval                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 7. INSTITUTIONAL ESG CERTIFICATE:                                                      │
│    • BRAC University Q1 Certificate • 1,420kg diverted • 2.45 Tons CO2e avoided        │
│    • Clickable public verification link: /verify/CERT-BRACU-2026-Q1                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
