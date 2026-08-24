# Ticket 11: Dynamic Seed Data Engine & Complete 7-Scenario Mid-Lifecycle Matrix

**Specs:** SPEC 20 (Screen Inventory), SPEC 21 (Seed Data & Scenarios), SPEC 22 (Rubric Defense & Viva Guide)  
**Owner:** All Team (`m1`, `m2`, `m3`, `m4`)  
**Status:** `ready-for-agent`  
**Blocked by:** Tickets 01a–10 (All preceding feature slices)  
**Blocks:** None (Final Milestone & Evaluation Readiness)  

---

## 1. Goal & Context
Guarantee the "Zero Empty Screens" invariant across all 27 Mobile Screens and 13 Admin Web Pages with active mid-lifecycle evaluation scenarios:
1. Upgrade `packages/db/src/seed.ts` with dynamic relative timestamps (`Date.now() + offset`) across all ~44 tables.
2. Seed all required tables including `auction_lots`, `auction_bids`, `valuation_scans`, `conversations`, `messages`, `user_streaks`, `saved_listings`, `zone_capacity_logs`, `drop_sessions`, `deposit_records`, `kyc_extractions`, `trust_decisions`, `fraud_flags`, `custody_handovers`, `buyer_demands`, `demand_matches`, `negotiation_threads`, `redemption_requests`, `payout_records`, `escrow_holds`, `disputes`, `impact_records`, `sustainability_certificates`, and 36 `rate_card_entries` (9 categories × 4 condition bands).
3. Prime all 7 mid-lifecycle demo scenarios (Live Auction countdown, Pending Deposit, Trust Gate Escalation queue, Bilateral Counter-offer, Reverse Demand Match, Partner KYC OCR Adjudication, Institutional ESG Certificate).
4. Verify complete rendering across all 27 Mobile Screens and 13 Admin Web Pages with zero empty screens.
5. Re-run complete test suite and seed setup ensuring 100% pass rate.

---

## 2. Vertical Tracer Bullet Scope
- **Seed Engine (`packages/db/src/seed.ts`):**
  - Seed complete data across all 44 tables with relative timestamps and valid foreign keys.
- **Verification (`pnpm test` + `pnpm db:setup`):**
  - All Jest suites passing.
  - Seeding runs cleanly without foreign key or constraint errors.
  - Mid-lifecycle scenario verification in both Web Admin and Mobile App interfaces.
