# SPEC 04 — Collections, E-Waste, Trust Gate & Green Wallet

**Owner: Member D** · PRD features 18–23 · Depends on: SPEC 00 (Trust Gate interface, credit invariants, state machines), SPEC 01 (partners, disputes, notifications), SPEC 02 (matched listings create pickup tasks), SPEC 03 (rate card prices credits; verified outcomes feed impact)

---

## Problem Statement

Recycling rewards attract fraud like honey — duplicate photos, GPS spoofing, inflated weights, self-dealing between users and collectors (documented across deposit-return and reverse-vending systems worldwide). The classic response — humans verify everything — kills the platform: admin headcount ends up scaling 1:1 with users. Meanwhile e-waste is legally special in Bangladesh (2021 DoE Rules) and credits mean real money once cash-out exists. The platform needs verification that is **automatic when signals are clean and human only when they are not**, a drop-infrastructure cheap enough for campuses, and a wallet whose every taka is reconstructable.

## Solution

Four systems: (1) **QR Drop Zones** — admin-registered physical collection points at campuses/offices whose printed QR codes anchor deposits to a place; (2) **Deposit & Pickup flows** — scanned deposits and partner pickups producing evidence bundles (in-app photo, category, weight); (3) the **Trust Gate** — a rules engine evaluating the A4 signal stack on every deposit, pickup completion, and redemption: all-pass → auto-clear, any-fail → escalate to an admin queue with reasons; e-waste/hazardous always escalate; 5% random audits of auto-clears; (4) the **Green Wallet** — an append-only ledger where credits exist as `pending` until a Trust Decision verifies them, and redemptions (mock bKash) clear through the same gate. Verified weight — never user-declared weight — computes credits (G10).

## User Stories

**E-waste verified-partner workflow**
1. As a user, I want my e-waste listing/deposit routed only to DoE-licensed partners, so that handling is legal (invariant §2.5).
2. As a user, I want to see the licensed recycler's name as the downstream destination, so that I trust the outcome (A6).
3. As an admin, I want every e-waste action forced through the escalation queue regardless of AI confidence, so that hazardous items always get human eyes (invariant §2.4).
4. As an admin, I want a handover record (photo + verified pieces/weight + licensed partner ID) per e-waste batch, so that compliance is auditable.

**QR Drop Zones**
5. As an admin, I want to register a drop zone (institution, name, geo, accepted categories) and generate its unique QR code, so that zones are printable posters.
6. As an admin, I want to pause/retire a zone, so that a full or broken bin stops accepting deposits.
7. As a zone host (institution contact), I want zone status and fill reporting to reach my assigned partner, so that bins get emptied (A8: emptying is contracted, not hoped for).

**QR deposits**
8. As a user, I want to scan the zone's QR in-app, select the category, and take an in-app photo of my deposit, so that my drop is recorded with evidence.
9. As a user, I want credits shown as **pending** immediately after deposit, so that I know the outcome is being verified — not silently rejected.
10. As the system, I want weight to be recorded by the zone/collector at emptying (verified weight), so that credits reflect reality, not claims (G10).
11. As the system, I want deposits at retired/wrong-category zones rejected at scan time, so that bad data never enters the pipeline.

**Pickup tasks & two-sided confirmation**
12. As the system, I want a pickup task auto-created when a marketplace request is matched (SPEC 02) or a zone needs emptying, so that logistics have an owner.
13. As an admin, I want to assign tasks to verified partners by capability and service area, so that routing is correct (A5: admin dispatch, no collector app).
14. As a partner, I want my task list with schedule and location, so that I can execute pickups (thin partner app surface: view + confirm).
15. As both parties, I want two-sided pickup confirmation — partner's photo evidence + in-person QR/OTP handshake with the giver, so that imposter pickups fail (Cashify fraud lesson).
16. As a partner, I want to confirm condition and final weight/pieces at pickup with price adjustment, so that AI estimates become honest final values (A1).
17. As a user, I want to dispute a pickup outcome (no-show, weight disagreement), so that conflicts pause credit verification and enter the dispute queue (SPEC 01).

**Trust Gate**
18. As the system, I want every deposit, pickup completion, and redemption evaluated against the full signal stack, so that clean actions clear in seconds (auto-clear target ≥70%).
19. As an admin, I want an escalation queue showing exactly which signals failed and the evidence bundle, so that a decision takes under a minute.
20. As an admin, I want 5% of auto-cleared actions randomly re-queued for audit, so that the gate itself stays honest (Back Market mystery-shopping pattern).
21. As the system, I want every decision recorded (subject, signals, outcome, decided_by), so that any credit is traceable to a decision (invariant).

**Green Wallet & redemption**
22. As a user, I want a wallet showing pending vs verified balances and a full transaction history, so that nothing is mysterious.
23. As a user, I want credits verified immediately when the Trust Gate clears my deposit/pickup, so that reward feels instant.
24. As a user, I want to request redemption (min ৳300, verified balance only) with an honest fee note ("real bKash cash-out ≈1.85%"), so that the mock is credible (A3).
25. As the system, I want routine redemptions auto-approved and unusual patterns (velocity, amount vs. history, new account) escalated, so that the credit pool survives fraud.
26. As an admin, I want a monthly redemption liability cap with hard blocking above it, so that economics can't bleed out silently (A3).
27. As a user, I want mock payout records with a reference number, so that the demo loop closes end-to-end.

## Implementation Decisions

- **QR zones:** `qr_code_id` = signed opaque token (not guessable sequence); scanning resolves zone server-side and validates zone status + category acceptance before the deposit form opens. Posters are generated from the admin console (print-ready PNG/PDF).
- **Deposit flow:** camera-only capture (no gallery) for evidence; capture-time GPS checked against zone geofence OR physical QR presence satisfies location (A4 signal 3); EXIF stripped on ingest post-check (A9).
- **Weight authority (G10):** deposits carry `declared_weight?` (optional) and `verified_weight` set at zone emptying/pickup confirmation; **credits compute from verified values only**; zone emptying is itself a pickup task with a scale-reading photo.
- **Trust Gate engine:** pure server function `evaluate(subject, signals) → TrustDecision` implementing A4 exactly; thresholds (velocity caps, weight bands, geofence radius, amount-vs-history factor) live in an admin-editable config table with audit log — tuning must never require a deploy.
- **Escalation queue:** admin console screen ordered by age; each item shows evidence bundle + failed signals; decision actions: verify / reject / request-more-info (opens dispute). SLA display (oldest-first highlighting).
- **Wallet:** `CreditTxn` append-only; balances derived (`SUM(verified) - SUM(redeemed)`); pending entries carry `source_id` + `trust_decision_id` once decided (invariant traceability); campaign multipliers recorded on the txn (SPEC 03 hand-off).
- **Redemption:** guards per SPEC 00 §8 interface (min ৳300, verified-only, monthly cap, account-age/velocity signals); `paid(mock)` writes a mock bKash reference (`MOCK-BKASH-<uuid>`) — the swap point for real disbursement post-MVP.
- **Partner task surface:** read-confirm list only (A5); all assignment by admin; partner confirms via app with evidence photo.
- **Notifications:** deposit verified / credits verified / redemption approved-rejected-paid / task assigned emit SPEC 01 notifications.

## Testing Decisions

- **Seams:** (a) Trust Gate as a **pure decision function** — exhaustive rule-table tests (every signal combination → expected outcome), the highest-value tests in the whole project; (b) ledger integrity tests (invariant: balance == sum(ledger) at every step, concurrent grants/redemptions); (c) flow integration tests at the API seam.
- Test: deposit happy path scan→pending→verified→credits; each fraud fixture (duplicate pHash, gallery-upload attempt, out-of-geofence, velocity breach, e-waste) → escalates with correct reason; e-waste *always* escalates even with all-green signals; redemption guards (below min, above verified balance, above monthly cap, velocity) each block correctly; 5% audit sampling fires deterministically under seeded RNG; ledger never goes negative under concurrent redemption attempts; two-sided handshake required before pickup completion.
- Load spot-check: 100 concurrent deposits at one zone without duplicate credit grants.

## Out of Scope

- Real bKash disbursement (exclusion — mock only), IoT fill-level sensors (exclusion), individual collector accounts/dispatch (A5), live route optimization (exclusion), chain-of-custody tracking (exclusion), cash handling of any kind, full recycler compliance reporting (post-MVP).

## Further Notes

- This spec is the project's fraud surface and legal surface in one — when in doubt, **escalate**. A false escalation costs an admin 60 seconds; a false auto-clear costs the trust model.
- Trust Gate thresholds will be wrong at launch; that's expected — they're config, and Sprint 4 includes a tuning pass against pilot data (see sprint plan, ticket TD8).
