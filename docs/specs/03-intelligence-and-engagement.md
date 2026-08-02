# SPEC 03 — Intelligence & Engagement (Next-Life Agent, Rate Card, Impact, Gamification)

**Owner: Member C** · PRD features 15, 16, 17, 24, 25 · Depends on: SPEC 00 (agent interface, invariants), SPEC 01 (users, institutions, notifications), consumed by SPEC 02 (listing pre-fill), consumes SPEC 04 (verified outcomes feed impact)

---

## Problem Statement

Users treat every unwanted item as garbage because deciding between reuse/donate/repair/resell/recycle is cognitive work they're not equipped for — and pricing their item against a haggling kabadiwala is worse. Meanwhile, sustainable behavior is invisible: no feedback loop, no recognition, no reason to come back. Competitive research confirms cross-path reasoning is *genuinely unoccupied* white space — but also that AI scanning alone is table stakes (Bower ships it free in 170 countries). The differentiator is the **reasoned recommendation with a visible rationale**, anchored to honest local prices, plus an engagement loop that makes verified impact visible.

## Solution

Three systems: (1) the **Next-Life Agent** — a server pipeline that reads listing photos, classifies category via an off-the-shelf multimodal vision call, *suggests* a condition band, estimates value from the admin rate card, and reasons to a recommended path with a short user-readable rationale the user can confirm or override; (2) the **Rate Card console** — admin-managed dual-unit pricing (per-kg materials, per-piece e-waste/appliances) with weekly review cadence, published in-app; (3) **Impact & engagement** — a personal impact dashboard, individual + institution leaderboards, and a badge/milestone/campaign system, all fed exclusively by *verified* outcomes (never user claims).

## User Stories

**Next-Life Agent**
1. As a user, I want to photograph my item and get a recommended next-life path with a plain-language rationale, so that I understand *why* repair beats recycle for this item.
2. As a user, I want to see the detected category and suggested condition, so that I can sanity-check the AI.
3. As a user, I want an estimated value range from the current rate card, so that I know what's fair before anyone makes an offer.
4. As a user, I want to confirm or override any part of the analysis (category, condition, path), so that I stay in charge — with my choice recorded.
5. As a user, I want the analysis to pre-fill my listing when I proceed, so that listing takes seconds (hand-off to SPEC 02).
6. As a user, I want a graceful manual path when the AI is unavailable or unconfident, so that I'm never blocked.
7. As the system, I want e-waste/hazardous detections to force recycle-path recommendation and downstream human escalation, so that safety is invariant — never overridable by the user.
8. As an admin, I want every analysis logged (input hash, provider, confidence, overrides), so that quality is auditable and cost is trackable.

**Rate Card console**
9. As an admin, I want to create/edit rate-card entries (category × condition band × unit[kg|piece] → ৳), so that estimates reflect Dhaka's real market.
10. As an admin, I want per-piece pricing for e-waste/appliances and per-kg for materials, so that pricing matches market convention (A2).
11. As an admin, I want entries versioned with effective dates, so that historical estimates remain explainable.
12. As an admin, I want a weekly-review reminder, so that rates don't drift stale (risk #4, validation report).
13. As a user, I want to browse the published rate card in-app, so that pricing is transparent before I list.
14. As the system, I want the Next-Life Agent's value range computed from the *current* rate card, so that estimates and payouts never diverge.

**Impact dashboard**
15. As a user, I want a dashboard of my completed actions, material weight diverted, credits earned, and badges, so that my impact is visible.
16. As a user, I want estimated environmental impact (CO₂e avoided) computed from a published heuristic factor table, so that numbers are honest and explainable — not certified-precision greenwashing (G12).
17. As a user, I want to see where my items went (named downstream destinations), so that I trust the outcome (A6).
18. As an admin, I want to edit the impact-factor table, so that estimates improve without code changes.

**Leaderboards**
19. As a user, I want an individual leaderboard (weekly/monthly/all-time) ranked by verified credits, so that effort is recognized.
20. As an institution member, I want my campus's aggregate ranking, so that community pride drives participation (A8 — institutions are the payer).
21. As a user, I want to opt out of public leaderboard display, so that privacy is respected.

**Badges, milestones & campaigns**
22. As a user, I want badges for milestones (first verified deposit, 10kg diverted, first donation, e-waste steward), so that progress feels concrete.
23. As an admin, I want to create time-boxed campaigns (e.g., "E-waste Week: 2× credits on verified e-waste deposits"), so that behavior can be steered toward partner capacity.
24. As a user, I want campaign multipliers applied automatically and shown in my wallet history, so that rewards are transparent.
25. As the system, I want badges/leaderboards computed from verified ledger + outcome data only, so that gamification can never reward unverified claims.

## Implementation Decisions

- **Agent pipeline (server):** exactly the SPEC 00 §8 interface. Steps: receive photos → pHash store → vision call (category + suggested condition + visible-damage notes) → rate-card lookup (value range) → path reasoning (deterministic rules over category/condition/value, e.g., working+valuable→resell; damaged+repairable→repair; no resale market→donate/recycle) → rationale text. Path reasoning is **code, not LLM free-text** — the LLM may draft the rationale sentence but the *decision* comes from auditable rules (keeps the differentiator defensible and testable).
- **Confidence & fallback:** below-threshold confidence or provider error → manual category picker; agent still routes once category is known. Hard budgets: ≤2 vision calls/listing, p95 <8s, monthly spend guard (NFR §9).
- **Condition authority:** agent output is advisory (A1); final condition/price confirmed at pickup per SPEC 04; the listing shows "AI estimate — confirmed at pickup."
- **Rate card:** `RateCardEntry` per SPEC 00 §7, versioned (effective_from, superseded_by); agent and UI always read the currently-effective row; console is admin-console-only.
- **Impact factors:** `ImpactFactor(category → co2e_per_kg)` admin-editable; dashboard displays "estimated" wording always; totals derive from verified deposits/pickups only.
- **Leaderboards:** materialized nightly (cron) from ledger into `LeaderboardEntry` — never computed on request; institution aggregate = sum of member verified credits in window; opt-out flag respected at query time.
- **Badges:** rule table (predicate over ledger/outcomes) evaluated on credit verification; campaign multiplier applied at credit-grant time and recorded on the CreditTxn (auditability).
- **Notifications:** badge earned / campaign launched / leaderboard rank change emit SPEC 01 notifications.

## Testing Decisions

- **Seams:** (a) agent pipeline tested at its function boundary with **recorded vision-provider fixtures** (golden photo set → expected category/path) — no live API in CI; (b) rate-card versioning via API tests; (c) gamification via ledger-in/leaderboard-out integration tests.
- Test: each of 9 categories × path-routing rules; e-waste forces recycle + escalation flag even when user tries to override; provider failure → manual fallback path; value range always derives from effective rate row; leaderboard windows compute correctly; campaign multiplier lands on the CreditTxn with correct audit fields; opt-out hides user publicly but retains their data.
- Track a **classification accuracy log** on the golden set as a CI artifact (trend, not gate — vision quality is empirical).

## Out of Scope

- Custom-trained vision models (PRD exclusion), live market-price scraping (exclusion), multi-language chatbot (exclusion), certified carbon accounting (exclusion), public impact map (exclusion), AI condition *grading* as final truth (A1), personalized ML recommendations.

## Further Notes

- The rationale is the product: keep it ≤60 words, plain language, always citing the deciding factor ("Repairable phones resell for 3–5× their scrap value — a repair shop will offer more than a recycler."). If the rationale reads like generic AI filler, the differentiator dies.
- Watch API cost per analysis in the first pilot week; if >$0.02/listing, tighten image resolution or provider tier.
