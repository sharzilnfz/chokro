# Chokro — Product Requirements Document (PRD v2.0)

**Status:** Ratified baseline — pending team sign-off on open decisions OD-1…OD-6 (§14)
**Date:** 2026-08-02
**Synthesized from:** [`./competitive-analysis.md`](./competitive-analysis.md) · [`./validation-report.md`](./validation-report.md) · [`../specs/`](../specs/) · [`../planning/feature-slate.md`](../planning/feature-slate.md)

**Reading rule:** this PRD states **what and why**. Engineering constraints live in [`../specs/00-product-capability.md`](../specs/00-product-capability.md); detailed requirements live in specs 01–04; delivery lives in [`../planning/feature-slate.md`](../planning/feature-slate.md). On conflict: this PRD wins on product intent, SPEC 00 wins on engineering constraint.


---

## 1. Problem Statement

People, campuses, and offices in Bangladesh treat every unwanted item as garbage because the alternatives are broken. Selling means haggling with informal collectors over opaque prices, or posting on Bikroy/Facebook and absorbing scams, no-shows, and zero recourse. Donating, repairing, and recycling have no trustworthy rails at all. The result: repairable phones get scrapped, donatable clothes get landfilled, e-waste — regulated under Bangladesh's 2021 DoE Rules — flows into informal channels, and no one can prove where anything went. Users lack three things at once: a *decision* (what's the best next life for this item?), a *trusted transaction* (who do I give it to, at what fair price?), and *proof* (did it actually get there?).

## 2. Solution

Chokro is a mobile circular-economy platform (Android-first) that answers all three in one loop:

1. **Decide** — the user photographs an item; the **Next-Life Agent** detects its category, suggests condition, estimates value from a published rate card, and recommends one of five paths — **reuse, donate, repair, resell, recycle** — with a short visible rationale the user can confirm or override.
2. **Transact** — the platform routes the item through a marketplace (buy-now, collection request, or single-round partner offers) or a campus **QR Drop Zone**, with pickup scheduling and two-sided confirmation.
3. **Prove & reward** — the **Trust Gate** verifies the outcome against an explicit signal stack: clean matches auto-clear in seconds; anomalies escalate to a human admin. Verified outcomes mint **Green Credits** (pending → verified) redeemable via a mock-bKash cash-out, and feed impact dashboards, leaderboards, and badges.

One system, not three disconnected rules: decision support, verification, and rewards are bound by a single ledger where no credit exists without a verified real-world outcome.

## 3. Differentiators (validated against the market — see [`./competitive-analysis.md`](./competitive-analysis.md))

| Claim | Status |
|---|---|
| Cross-path reasoning with visible rationale ("repair beats recycle, here's why") | **Genuinely unoccupied white space** — every competitor forces one path per category |
| Verified-but-cheap trust infrastructure (QR zones + Trust Gate signal stack) | Differentiated — nobody occupies the middle between GPS-only apps and $$$ kiosks |
| Bangladesh localization (bKash-style payout, per-piece e-waste rates, DoE-licensed routing) | Uncontested — no verified local player offers AI valuation, rewards, or multi-path disposal |
| AI photo-scanning, leaderboards, badges | **Table stakes** (Bower ships all of these) — kept, but never pitched as the moat |

## 4. Goals & Success Metrics (pilot = 1 campus, 8 weeks)

MVP succeeds if, at pilot end: (a) ≥60% of listings reach a completed next-life outcome; (b) Trust Gate auto-clears ≥70% of verifications with <2% fraud slip-through; (c) ≥200 verified deposits/pickups completed; (d) median photo→recommendation latency <8s; (e) zero unresolved e-waste compliance issues; (f) pilot partners: 1 campus ops contract, 1 NGO, 1 DoE-licensed e-waste recycler, 3–5 collection partners.

## 5. Users & Actors

- **Individuals / households / students** — give, sell, donate, buy (one account, both sides)
- **Institution members** — users linked to a campus/org (leaderboards, zone access)
- **Partner organizations** — verified collectors, recyclers, repair shops, vendors, NGOs, with capability flags per type; **e-waste partners must hold a DoE license**
- **Admins** — partner verification, rate card, Trust Gate escalation queue, moderation
- **System actors** — Next-Life Agent (recommendation pipeline), Trust Gate (verification pipeline)

> There is deliberately **no individual-collector actor at MVP** (Decision A5): pickup work is dispatched by admins to partner organizations; informal-sector integration is post-MVP.

## 6. Validated Ground Truths (evidence in [`./validation-report.md`](./validation-report.md))

- Android ≈91% of Bangladesh's mobile OS share → Android-first build is correct.
- bKash: 82M+ users; agent cash-out fee 1.85% → micro-payouts are bad UX; minimum threshold required.
- Dhaka's scrap market already runs on **published rate cards with dual pricing**: per-kg materials, **per-piece e-waste/appliances** (BanglaBin). Our rate card adopts this convention.
- "Verified e-waste partner" = **DoE-licensed** (E-Waste Management Rules 2021); no public registry exists → license documents verified manually at onboarding.
- Off-the-shelf vision classifies item **category** well and cheaply (~$0.002–0.01/image) but **cannot reliably grade condition** → AI suggests; humans confirm condition/price at pickup.
- Reward-fraud is documented and existential (RVM exploits, GPS spoofing, self-dealing) → Trust Gate runs an explicit signal stack with random audits.

## 7. Product Decisions Adopted (Amendments A1–A10)


1. **A1 — AI advises, humans decide value.** Agent output = category + *suggested* condition + value range + path + rationale. Final condition/price confirmed by the partner at pickup, with price adjustment.
2. **A2 — Rate card:** dual-unit (per-kg / per-piece with condition bands), versioned, weekly admin review, launch with 8–10 SKUs.
3. **A3 — Credit economics:** 1 Green Credit = ৳1 (OD-6); minimum cash-out ৳300; mock UI discloses "~1.85% real-world fee"; monthly redemption liability cap ৳50k; credits expire after 12 months of inactivity.
4. **A4 — Trust Gate signal stack:** auto-clear only if ALL pass — in-app camera capture, perceptual-hash uniqueness, QR-at-zone or geofence match, declared-vs-vision category match, verified weight in band, velocity caps, clean pair history. Any failure → escalation queue with reasons. 5% of auto-clears randomly audited. E-waste/hazardous ALWAYS escalates regardless of signals.
5. **A5 — No collector app at MVP:** admin-dispatched partner organizations only.
6. **A6 — Downstream transparency:** every category displays a named destination ("e-waste → DoE-licensed recycler") to users.
7. **A7 — Metrics + pilot scope** as defined in §4.
8. **A8 — Institutional payer is a product requirement:** the campus that hosts zones also funds the credit pool and zone-emptying; features (institution leaderboard, sponsored campaigns) point at that payer.
9. **A9 — Photo privacy:** camera-only evidence capture, EXIF/GPS stripped server-side after the geofence check, evidence retained ≤90 days, account deletion purges PII ≤30 days.
10. **A10 — Platform:** mobile app, Android-first cross-platform (React Native + Expo, TypeScript).

## 8. MVP Scope — 25 Features (revised; ▲ = amended from v1.0)

**Users & trust**
1. Sign up, login, profile management ▲ *(email-based at MVP; phone OTP post-MVP — SMS cost)*
2. Role-based access: individual, verified partner, admin
3. Partner organization registration + admin verification ▲ *(capability flags per partner type; DoE license mandatory for e-waste)*
4. Location and pickup-area setup
5. In-app + push notifications (offers, pickups, credits, campaigns) ▲
6. Report/dispute and listing-moderation workflow

**Circular marketplace**
7. Listings with photos, category, condition, weight (materials) **or pieces (e-waste/appliances)** ▲, location, price
8. Five-path selection (reuse/donate/repair/resell/recycle) with the agent's recommendation as default
9. Categories: clothes, books, plastics, paper, metal, glass, furniture, appliances, e-waste
10. Browse with search, category, location, condition, and path filters
11. Buy-now or collection-request flow
12. Offer flow for recyclables ▲ *(single-round, binding, 48-hour expiry — explicitly NOT an auction)*
13. Pickup scheduling + transaction status tracking ▲ *(two-sided QR/OTP handshake at pickup — anti-impersonation)*
14. Completion + two-sided partner/user ratings

**Smart sustainability support**
15. Next-Life Agent ▲ *(photo → category + suggested condition + rate-card value range + path recommendation + ≤60-word rationale; user confirms or overrides; e-waste forces recycle-path + human escalation; manual fallback when AI unavailable)*
16. Rate-card admin console ▲ *(dual-unit, versioned, weekly review cadence; published in-app)*
17. Personal impact dashboard ▲ *(verified outcomes only; estimated CO₂e via admin-editable factor table; named downstream destinations)*

**E-waste & QR collection**
18. Verified-partner-only e-waste workflow ▲ *(licensed-partner routing enforced; always human-escalated; handover records kept)*
19. QR drop-zone generation (campuses, schools, offices, apartments) + printable posters
20. QR deposit scan + record ▲ *(camera-only evidence; credits pending; weight verified at zone emptying — never user-declared)*
21. Pickup-task creation, assignment, and Trust Gate verification ▲ *(explicit signal stack; escalation queue; 5% random audits)*

**Rewards & engagement**
22. Green-credit wallet + append-only ledger; credits pending until verified
23. Redemption with Trust Gate-assisted approval ▲ *(min ৳300, monthly cap, mock bKash with honest fee disclosure)*
24. Individual + institution leaderboards ▲ *(weekly/monthly/all-time; computed from verified ledger only; opt-out)*
25. Badge, milestone, and campaign system ▲ *(campaign multipliers recorded on the ledger)*

## 9. Explicitly Excluded from MVP (revised — v1.0 exclusions retained, new ones marked ●)

- Real bKash disbursement (mock only — integration is contract-gated, post-pilot)
- IoT fill-level sensors · live route optimization · certified carbon/emissions math
- Custom-trained AI image model (off-the-shelf multimodal vision only)
- Complex bid auctions and escrow · public impact map · chain-of-custody · partner voucher portal · multi-language chatbot · live market-price scraping
- Fully autonomous approval for hazardous/e-waste items (always a human)
- ● Individual collector/driver app (admin dispatch to partner orgs — A5)
- ● Automated condition grading as final truth (human confirms — A1)
- ● Consumer-paid subscriptions (evidence: doesn't fit this market)
- ● Centralized warehousing/processing of items (ThredUp's structural-loss lesson)
- ● In-app chat and real-money payments between users (settle out-of-band; masked phone reveal post-match)

## 10. Core User Stories (full 100+ story sets live in specs 01–04)

1. As a user, I want to photograph an item and receive a recommended next-life path with a plain-language rationale, so that I understand *why* it's the best option.
2. As a user, I want to see the detected category, suggested condition, and rate-card value range — and override any of them — so that I stay in charge.
3. As a user, I want the analysis to pre-fill my listing so that listing takes under 2 minutes — faster than writing a classified ad.
4. As a user, I want to browse the published rate card, so that I know fair prices before anyone makes an offer.
5. As a user, I want to choose donate/repair/resell/recycle/reuse and have the right counterparties see my item.
6. As a user, I want to see the named downstream destination for my category, so that I trust where my item ends up.
7. As a buyer, I want to buy now or request collection, and track status from matched to completed.
8. As a partner, I want to make a single binding offer on recyclable materials, so that pricing is transparent without auction dynamics.
9. As both parties, I want to confirm pickup in person via QR/OTP handshake, so that imposters fail.
10. As a partner, I want to confirm condition and final weight/pieces at pickup with price adjustment, so that AI estimates become honest final values.
11. As a user, I want to scan a drop-zone QR, deposit with in-app photo evidence, and see credits as pending immediately.
12. As the system, I want credits computed from verified weight/pieces only, never user claims.
13. As an admin, I want an escalation queue showing exactly which signals failed, so that decisions take under a minute.
14. As a user, I want verified credits in my wallet and redemption from ৳300 with an honest fee note, so that the reward loop feels real.
15. As a user, I want my impact (weight diverted, estimated CO₂e, badges) visible, and my campus ranked, so that effort is recognized.
16. As an admin, I want to verify partner organizations — requiring a DoE license for e-waste capability — so that routing is legal.
17. As an admin, I want to run time-boxed campaigns (e.g., "E-waste Week: 2× credits"), so that behavior steers toward partner capacity.
18. As a user, I want to report/dispute and see resolution, so that trust has recourse.

## 11. Implementation Decisions (summary — normative detail in SPEC 00)

- **Platform:** React Native + Expo + TypeScript, Android-first; Expo Camera/QR/push. Admin console = web, same backend codebase.
- **Backend (OD-2, ratified for Sprint 1 on 2026-08-06):** Next.js Route Handlers + PostgreSQL + Drizzle ORM; hosted image storage with server-side EXIF strip.
- **Vision provider (OD-4, recommended):** multimodal LLM API (Gemini Flash / GPT-4o-mini class); ≤2 calls/listing; monthly spend guard.
- **Agent architecture:** vision call → category + suggested condition; **path decision from deterministic, auditable rules** over category/condition/value — the LLM may phrase the rationale but never makes the routing decision.
- **Canonical state machines** (Listing, Deposit, PickupTask, CreditTxn, Redemption, Partner, Dispute, Offer) and the append-only-ledger + credit-traceability invariants are fixed in SPEC 00 §6/§2 and are binding on all code.
- **Trust Gate** is a pure server-side decision function over the A4 signal stack with admin-editable thresholds (no deploys to tune).
- **Data model:** 16 core entities defined in SPEC 00 §7.

## 12. Testing & Quality Decisions (V&V built into delivery)

- TDD per ticket; good tests assert external behavior at the API seam, not internals.
- Trust Gate gets exhaustive rule-table tests (every signal combination → documented outcome) — the highest-value test suite in the project.
- Vision pipeline tested against recorded golden-set fixtures (real low-end-phone photos) — no live API in CI; accuracy tracked as a trend artifact.
- Ledger invariants (balance == SUM(ledger); no negative under concurrency) tested explicitly; 100-concurrent-deposit load spot-check.
- `verification-loop` (build/types/lint/tests/security/diff) before every merge; coverage ≥80% on Trust Gate + wallet.
- Sprint-exit V&V gates 1–4 per [`../planning/feature-slate.md`](../planning/feature-slate.md) — verification (did we build it right) + validation (did we build the right thing: timed user tasks, auto-clear-rate targets, pilot dry-run).

## 13. Non-Functional Requirements

- Android 8+ on ৳10k-class hardware; cold start <3s on 4GB devices; photo upload tolerant of 3 Mbps uplink (client downscale ≤1600px / ≤500KB).
- Photo→recommendation p95 <8s; listing feed p95 <1.5s.
- Privacy per A9; no public user location (campus users may include minors); institution linkage by invite code.
- Language (OD-3): English UI + Bangla labels on primary actions at pilot.
- Auditability: every credit movement and Trust Gate decision reconstructable from ledger + decision records.
- Vision API spend ≤ $30/month at pilot scale.

## 14. Open Decisions (team must ratify — recommendations provided, do not improvise in code)

| ID | Question | Recommendation | Blocks |
|----|----------|----------------|--------|
| OD-1 | Auth method | **Ratified:** Email+password MVP | Sprint 1 |
| OD-2 | Backend stack | **Ratified:** Next.js Route Handlers + PostgreSQL + Drizzle ORM | Sprint 1 |
| OD-3 | UI language scope | English + Bangla key labels | Sprint 2 |
| OD-4 | Vision provider | Gemini Flash / GPT-4o-mini class | Sprint 2 |
| OD-5 | Pilot credit funding | Campus/sponsor budget (A8) | Sprint 3 |
| OD-6 | Credit economics ratification | 1 credit = ৳1; min ৳300; cap ৳50k/mo | Sprint 3 |

## 15. Delivery Plan (4 members × 4 features = 16 features — full detail in [`../planning/feature-slate.md`](../planning/feature-slate.md))

| Member | Capability area (spec) | S1 | S2 | S3 | S4 |
|---|---|---|---|---|---|
| A | Identity, Trust & Partners (01) | Auth/RBAC, partner verification | Notifications, areas | Disputes/moderation | Privacy hardening |
| B | Marketplace (02) | Listings, browse | 5-path, buy/collect | Offers, scheduling | Ratings, search v2 |
| C | Intelligence & Engagement (03) | Rate card | **Next-Life Agent** | Agent hardening, impact v1 | Leaderboards, badges, impact v2 |
| D | Collections & Wallet (04) | Ledger, QR zones | Deposits, pickup tasks | **Trust Gate**, redemption, e-waste | Tuning, load, audits |
| ALL | — | Scaffold (T0) | — | — | E2E V&V + pilot dry-run (T1) |

## 16. Top Risks (full list: [`./validation-report.md`](./validation-report.md) §3)

1. Condition-assessment disputes → A1 human-confirmation design
2. Reward fraud draining the credit pool → A4 signal stack + delayed credits + audits
3. Collector adoption failure → A5 partner-org dispatch; Bangla labels (OD-3)
4. Rate-card drift (volatile scrap prices) → weekly review; 8–10 launch SKUs
5. E-waste compliance liability → DoE-licensed partners only; handover receipts; no campus stockpiling

---

## Appendix A — Glossary (canonical terms for code and conversation)

**Listing** · **Next-Life Path** (reuse/donate/repair/resell/recycle) · **Rate Card** (category × condition band × unit kg|piece → ৳) · **Drop Zone** (QR-anchored physical collection point) · **Deposit** (scanned drop-off) · **Pickup Task** (assigned collection job) · **Trust Gate / Trust Decision** (verification layer + its records) · **Green Credit** (1 credit = ৳1, pending until verified) · **Wallet/Ledger** (append-only credit log) · **Redemption** (mock-bKash cash-out request) · **Escalation Queue** (admin review list) · **Downstream Destination** (named endpoint per category).

## Appendix B — Document Map

| Document | Role |
|---|---|
| [`./PRD.md`](./PRD.md) (this file) | Product truth: what & why |
| [`../specs/00-product-capability.md`](../specs/00-product-capability.md) | Engineering constraints: states, invariants, interfaces, entities |
| [`../specs/`](../specs/) | Detailed requirements per capability area (100+ user stories, 01–04) |
| [`../planning/feature-slate.md`](../planning/feature-slate.md) | 16-feature allocation across team members with external APIs and DB entities |
| [`./competitive-analysis.md`](./competitive-analysis.md) | Market evidence: 11 platforms, patterns, failure modes, white space |
| [`./validation-report.md`](./validation-report.md) | Ground-truth evidence: assumption ledger, risks, sources |

