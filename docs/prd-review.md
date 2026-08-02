# Chokro — PRD Review & Optimization

**Source reviewed:** `chokro-IDEAS.txt` (77 lines, 25 features, 5 capability areas)
**Review method:** Verification (is the PRD specified *right* — complete, consistent, testable?) + Validation (is it the *right product* — evidence from `docs/competitive-analysis.md` and `docs/validation-report.md`)
**Date:** 2026-08-02

---

## 1. Verdict

The PRD is **above average for an ideas document**: it has a coherent core loop, two genuinely defensible differentiators (Next-Life Agent's cross-path reasoning; Trust Gate triage), and an unusually disciplined "explicitly excluded from MVP" list. It is **not yet implementable**: it lacks state machines, data ownership, credit economics, Trust Gate decision rules, non-functional requirements, and success metrics. Two PRD assumptions are challenged by evidence (AI condition grading; collector app adoption) and must be amended before build.

**Recommended flow:** adopt amendments A1–A10 → build from `docs/specs/` → execute `docs/sprint-plan.md`.

---

## 2. What the PRD gets right (keep these)

1. **Five-path routing as one decision.** Framing reuse/donate/repair/resell/recycle as a single reasoned choice is the product's soul. Competitive research confirms *nobody* does cross-path reasoning with visible rationale (Bower = recycle only, Cashify = resell only, ThredUp = consign only). Invest here.
2. **Trust Gate as triage, not full automation.** "Auto-clear routine, escalate anomalies" matches the only proven trust shape in the market (ecoATM: machine grades + ID gates + humans for edge cases; Cashify: algorithm quotes, agent verifies; Back Market: algorithm ranks, mystery shoppers audit).
3. **Credits pending-until-verified.** Matches Recykal's award-winning deposit-refund mechanic and is correct fraud hygiene.
4. **The exclusion list.** Mock bKash, no custom-trained model, no IoT, no escrow auctions, no live price scraping — every exclusion is supported by research evidence. This is the strongest part of the PRD.
5. **QR drop zones at campuses.** Cheapest possible trust infrastructure; nobody occupies the "verified-but-cheap" middle between Bower (GPS-only, no verification) and ecoATM (verified but $$$ kiosks).
6. **Hazardous/e-waste always routes to a human.** Correct safety posture; also aligns with Bangladesh's E-Waste Management Rules 2021.

---

## 3. Gap analysis (Verification — is the PRD specified right?)

Severity: 🔴 blocks implementation · 🟡 blocks quality · 🟢 nice to have

### G1 🔴 No state machines or lifecycle definitions
The PRD implies lifecycles but defines none. Without canonical states, four engineers will build four inconsistent versions of: Listing, Deposit, Pickup Task, Credit Transaction, Redemption, Partner, Dispute.
→ **Fixed in** `docs/specs/00-product-capability.md` §6 (canonical state machines adopted across all specs).

### G2 🔴 Trust Gate has no decision rules
"Checks the deposit against the reported category, weight, and photo evidence" — but what *signals* justify auto-clear? What thresholds escalate? Only redemption gets hints (velocity, amount, history). Fraud research (reverse-vending exploits, deposit-return fraud literature, GPS-spoof documentation) shows this is existential, not edge-case.
→ **Amendment A4** defines the signal stack; `docs/specs/04-collections-and-wallet.md` specs it.

### G3 🔴 Green Credit economics are undefined
No credit-to-taka conversion, no minimum cash-out, no funding source, no liability cap, no expiry. bKash cash-out costs users 1.85% at agents — small payouts feel bad and bleed value. Every rewards-for-recycling player that failed (Cashify ₹148 Cr FY23 loss; ThredUp structural losses) died on unit economics.
→ **Amendment A3** proposes concrete numbers (team to ratify).

### G4 🔴 Next-Life Agent contract is unspecified
No input/output schema, no confidence handling, no fallback when the vision call fails, no latency/cost budget, no definition of "condition" the AI may claim. Validation research shows off-the-shelf vision classifies *category* well but **cannot reliably grade condition** — and condition sets payout, making it a dispute magnet.
→ **Amendment A1** narrows the AI's authority; contract spec'd in `docs/specs/03-intelligence-and-engagement.md`.

### G5 🔴 Rate card pricing model doesn't fit e-waste
"Category, condition, and weight pricing" — but Dhaka's market convention (verified: BanglaBin's published rate card) prices **e-waste and appliances per piece**, materials per kg. Weight-only pricing breaks 2 of 9 categories on day one.
→ **Amendment A2**.

### G6 🟡 Actor model is under-specified
"Individual, verified partner, admin" collapses collectors, recyclers, repair shops, vendors, and NGOs into one "partner" blob. They have different capabilities (a repair shop doesn't collect; an NGO doesn't buy). Also: can a user be both seller and buyer? (Must be yes.)
→ Partner *types* with capability flags defined in `docs/specs/00` §4 and `docs/specs/01`.

### G7 🟡 Collector-side channel is a risky assumption
The PRD assumes collectors use the app. Evidence: Dhaka's successful scrap operators (E-Vangariwala, 2,400+ pickups) run on **WhatsApp + web forms**, and Dhaka's ~120,000 informal waste pickers skew low-literacy. A collector-facing native app is the riskiest UX bet in the PRD.
→ **Amendment A5**: at MVP, pickup tasks are dispatched by admin console to partner *organizations*; no individual collector app.

### G8 🟡 Non-functional requirements are absent
Nothing on: platform (now decided: mobile app), UI language (Bangla/English — unresolved), offline tolerance, photo size/upload on ৳10k Android phones over 23 Mbps median, data privacy (photo EXIF carries GPS!), account deletion, notification channels.
→ NFRs added in `docs/specs/00` §9; **Amendment A9** covers photo privacy.

### G9 🟡 Offer/bid boundary contradicts the exclusion list
Feature 12 allows "offer/bid flow" while exclusions ban "complex bid auctions and escrow." The line between them is undefined.
→ **Resolved in spec 02**: single-round, expiring, binding offers; no outbidding dynamics, no escrow.

### G10 🟡 "Estimated weight" has no estimator
Deposits record "estimated weight" — a photo cannot weigh. Who estimates, and when does estimated become actual? Unresolved, this silently breaks Trust Gate weight matching and credit amounts.
→ **Resolved in spec 04**: user declares category; zone/collector weighs; credits compute from *verified* weight.

### G11 🟡 No success metrics or pilot scope
"Plausibly scale" is not measurable. No activation funnel, no auto-clear rate target, no fraud budget, no pilot definition.
→ **Amendment A7** proposes metrics + a 1-campus pilot frame.

### G12 🟢 Impact math undefined
"Estimated environmental impact" with certified calculations excluded — good — but the simple heuristic table (kg diverted × material factor) still needs to exist somewhere.
→ Defined as an admin-editable factor table in `docs/specs/03`.

---

## 4. Optimization recommendations (Validation — is it the right product?)

Evidence codes: **[CA]** competitive-analysis.md · **[VR]** validation-report.md

### A1 — Narrow the Next-Life Agent's authority: category + routing, not condition-as-truth
AI returns: category, **suggested** condition band, estimated value range, recommended path + rationale. **Condition is confirmed by the human collector/partner at pickup, with price adjustment** — exactly how Cashify and Dhaka's E-Vangariwala operate [VR §4][CA — Cashify]. Removes the biggest accuracy/dispute risk while keeping the differentiator (cross-path reasoning) intact.

### A2 — Rate card: dual unit pricing + weekly cadence + launch SKU limit
Per-kg for materials (paper, plastic, metal, glass); **per-piece with condition bands** for e-waste and appliances [VR §2 — BanglaBin convention]. Weekly admin review cadence. Launch with 8–10 SKUs, not all 9 categories × all conditions, to avoid rate drift bleeding money.

### A3 — Green Credit economics (proposed, team ratifies)
- **1 Green Credit = ৳1** (cognitive simplicity beats fractional schemes)
- **Minimum cash-out: ৳300** (bKash agent fee is 1.85%; below this, fees dominate) [VR §1]
- Mock UI must **honestly display** "real bKash cash-out would charge ~1.85%" — demos the loop credibly
- **Monthly redemption liability cap** (admin-set, e.g., ৳50,000 during pilot) — Trust Gate hard-blocks above cap
- **Credits expire after 12 months** of account inactivity (stated in wallet UI)
- Funding source during pilot = institutional sponsor (see A8); platform treats credits as marketing spend, not revenue promise [CA — Recykal/Bower lesson: *someone else funds the reward*]

### A4 — Trust Gate signal stack (explicit, ordered)
Auto-clear a deposit/pickup **only if ALL pass**: (1) photo captured in-app (camera-only, no gallery upload), (2) perceptual-hash not seen before (anti-duplicate), (3) EXIF stripped but capture-time GPS within zone geofence *or* physical QR scanned at zone, (4) declared category matches vision check, (5) verified weight within declared band, (6) user + partner velocity under daily caps, (7) user–partner pair has no anomaly history. Any failure → escalation queue, human decides. Redemptions add: amount vs. history, account age, redemption velocity [VR §5]. Random 5% of auto-cleared items get human audit (Back Market mystery-shopping pattern) [CA].

### A5 — Collector channel: partner organizations + admin dispatch, no collector app at MVP
Pickup tasks route to verified partner *organizations* via the admin console (contact via phone/WhatsApp out-of-band). Individual collectors and the informal feriwala network are **post-MVP** [VR §2]. This also shrinks Member D's surface to buildable size.

### A6 — Downstream transparency as a first-class field
Every category carries a named destination shown to users ("e-waste → DoE-licensed recycler"). TerraCycle's greenwashing lawsuit is the cautionary tale; Ridwell's "you see exactly what it becomes" is the trust model [CA]. Costs almost nothing; buy it from day one.

### A7 — Success metrics + pilot scope (proposed)
Pilot: **1 campus, 1 NGO donation partner, 1 DoE-licensed e-waste partner, 3–5 collection partners, 8 weeks.**
MVP success = (a) ≥60% of listings receive a completed next-life outcome, (b) Trust Gate auto-clear ≥70% with <2% fraud slip-through, (c) ≥200 verified deposits/pickups, (d) median photo→recommendation latency <8s, (e) zero unresolved e-waste compliance issues.

### A8 — Institutional payer is a product requirement, not a business footnote
Recykal abandoned consumer-side within 2 years; Bower's rewards are brand-funded; Kabadiwala survives on B2B [CA]. The campus contract that hosts QR zones should also fund the credit pool and zone emptying. PRD should state this explicitly so features (institution leaderboard, sponsored campaigns) point at the payer.

### A9 — Photo privacy & capture hygiene
Camera-only capture option, EXIF/GPS stripped server-side after geofence check, photos retained max 90 days post-verification, account deletion removes PII. Phone numbers and location are sensitive in this market; a campus user base may include minors.

### A10 — Platform decision (from team, 2026-08-02): mobile app
**Android-first cross-platform** (91% Android share in BD [VR §1]): React Native + Expo + TypeScript; Expo Camera/QR/Notifications cover the hardware needs. Backend: Next.js API + PostgreSQL (Prisma) + hosted image storage. Backend choice is marked **OD-2** (open decision) for team ratification.

---

## 5. Open decisions for the team (do not build on assumptions)

| ID | Question | Recommendation | Blocks |
|----|----------|----------------|--------|
| OD-1 | Auth: email vs phone OTP | Email + password at MVP (SMS OTP costs money; campus emails work) | Sprint 1 |
| OD-2 | Backend: Next.js API vs NestJS vs Supabase | Next.js API + Prisma (one language, one deploy) | Sprint 1 |
| OD-3 | UI language: English, Bangla, or both | English UI + Bangla for key action labels at pilot | Sprint 2 |
| OD-4 | Vision provider | Gemini Flash or GPT-4o-mini class multimodal (free/cheap tier sufficient) | Sprint 2 |
| OD-5 | Who funds pilot credits | Campus club budget / sponsor (A8) | Sprint 3 |
| OD-6 | Credit conversion & caps (A3 numbers) | Ratify 1 credit = ৳1, min ৳300 | Sprint 3 |

---

## 6. What we deliberately did NOT change

- The five-path model, the two-agent architecture, the exclusion list, the campus wedge, and the 25-feature scope. The PRD's product instincts held up well under evidence; the work was making it *implementable* and *economically survivable*, not reinventing it.
