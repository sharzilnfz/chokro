# Chokro — Sprint Plan (4 members × 4 sprints × 2 weeks)

**Baseline:** SPEC 00 manifest + specs 01–04 · **Team:** 4 full-stack, each owns a capability area across all 4 sprints · **Method:** tracer-bullet vertical slices with declared blocking edges (to-tickets); V&V gate at every sprint exit.

**ID conventions:** Tickets = `T<member><n>` (TA1…TD8) plus shared `T0`/`T1`. PRD amendments = `A1`–`A10` (see [`../product/prd-review.md`](../product/prd-review.md)). Gaps = `G1`–`G12`. Open decisions = `OD-1`–`OD-6`.

| Member | Capability area | Spec |
|---|---|---|
| **A** | Identity, Trust & Partners | [`../specs/01-identity-and-trust.md`](../specs/01-identity-and-trust.md) |
| **B** | Circular Marketplace | [`../specs/02-marketplace.md`](../specs/02-marketplace.md) |
| **C** | Intelligence & Engagement | [`../specs/03-intelligence-and-engagement.md`](../specs/03-intelligence-and-engagement.md) |
| **D** | Collections, E-Waste, Trust Gate & Wallet | [`../specs/04-collections-and-wallet.md`](../specs/04-collections-and-wallet.md) |

**Working agreements:** every ticket lands via PR with API-level tests (harness built in T0); `verification-loop` before every merge; OD-1/OD-2 ratified on day 1; rate card sanity-checked weekly against BanglaBin's published rates; Trust Gate (TD5) is project-critical — if it slips, Member C pairs with Member D.

---

## Sprint 1 — Walking Skeleton (weeks 1–2)

**Goal:** app boots against a real API + DB; a user can sign up, create a listing, and see it in a feed; admin can set rates and print a zone poster; the wallet ledger exists.

| Ticket | What it delivers | Blocked by |
|---|---|---|
| **T0** (ALL, days 1–3) | Monorepo scaffold: Expo app + Next.js API + Postgres/Prisma + image storage; CI (typecheck, lint, test); seed data; **API test harness (owned by Member C)**; dev deployment. Ratify OD-1, OD-2. | None — starts immediately |
| **TA1** | Email signup/login/reset, RBAC guards (individual/partner/admin), profile edit, institution link via invite code. | T0 |
| **TA2** | Partner application (org, types, service areas, documents) → admin verification queue → approve/reject with reason; capability flags; DoE-license gate on `e_waste_licensed`. | TA1 |
| **TB1** | Listing CRUD: 9 categories, dual-unit fields (kg vs per-piece), photos (client downscale ≤1600px), draft/active/cancelled. | T0 |
| **TB2** | Browse feed (cursor-paginated) + filters (category, area, condition) + listing detail. | TB1 |
| **TC1** | Rate-card admin console: CRUD, dual-unit pricing, versioning (effective_from), in-app published view. | T0 |
| **TD1** | Wallet + append-only ledger: CreditTxn schema, derived pending/verified balances, history view, admin adjust-with-reason. | T0 |
| **TD2** | Drop-zone registry: zones CRUD, signed QR tokens, print-ready poster generation. | T0 |

**Key acceptance criteria**
- T0: CI green on empty PR; one passing API test in CI; seed creates admin + demo user + 3 rate rows.
- TA1: non-admin hitting an admin route → 403; password reset email flow works; suspended user cannot list/redeem/deposit.
- TA2: admin cannot set `e_waste_licensed` without an uploaded DoE license doc; rejected partner receives reason.
- TB1/TB2: create → publish → appears in feed with correct filters; e-waste listing requires per-piece fields.
- TC1: editing a rate supersedes the old row (history preserved); agent/UI read only effective rows.
- TD1: balance == SUM(ledger) invariant test passes; ledger rejects updates/deletes at the DB layer.
- TD2: QR payload is a signed opaque token (not guessable from sequence); poster PDF renders zone name + QR.

**Sprint 1 exit — V&V gate 1:** *Verification:* CI green, all acceptance criteria pass, harness adopted by all four. *Validation:* rate card cross-checked against BanglaBin's published prices (are we in-market?); 5-minute scaffold demo to one non-team student (can they create a listing unaided?).

---

## Sprint 2 — Core Loops (weeks 3–4)

**Goal:** the two magic moments work end-to-end: **photo → agent recommendation → listing**, and **scan zone QR → deposit → pending credits**.

| Ticket | What it delivers | Blocked by |
|---|---|---|
| **TA3** | Notifications v1: in-app list, Expo push registration, event kinds (listing/pickup/credit) with deep links; user pickup-area setup (F4). | TA1 |
| **TB3** | Five-path selection on listings (agent recommendation as default, override allowed); path-based counterparty visibility; downstream-destination shown per category (A6). | TB1, TC1 |
| **TB4** | Buy-now / collection-request flow: request → seller accept/decline → listing `matched` → pickup task auto-created (hands to TD4). | TB2, TA3 |
| **TC2** | **Next-Life Agent v1**: photos → vision call → category + suggested condition + value range (from rate card) + path recommendation + ≤60-word rationale; confirm/override; pre-fills listing; manual fallback on failure/low-confidence. Ratify OD-4. | TC1, TB1 |
| **TD3** | Deposit flow: scan zone QR → category select → camera-only photo → deposit record `pending`; zone status/category validation at scan time. | TD2, TD1 |
| **TD4** | Pickup tasks: auto-create on match (TB4) or zone-emptying; admin assignment by capability/area; partner task list (view + confirm); two-sided handshake (giver shows QR/OTP, partner scans). | TD3, TB4 |

**Key acceptance criteria**
- TC2: golden-set fixtures (no live API in CI) → expected category/path per fixture; e-waste detection forces recycle + escalation flag and cannot be user-overridden; provider-down → manual category picker still routes; p95 analysis <8s in dev.
- TB3: path change alters eligible counterparty set; donate listings badge "free — donation".
- TB4: accept moves listing to `matched` and emits pickup-task creation; decline returns listing to `active` with notification.
- TD3: gallery-uploaded photos rejected; deposit at paused zone rejected; pending deposit visible in wallet immediately.
- TD4: partner sees only own tasks; pickup cannot complete without handshake scan.

**Sprint 2 exit — V&V gate 2:** *Verification:* agent accuracy log recorded on golden set (trend artifact); deposit + match flows E2E green. *Validation:* 5 target users complete photo→recommendation→listed in <2 minutes (timed — the "beat Bikroy" bar); rationale readability review (would a non-technical user understand the *why*?).

---

## Sprint 3 — Verification & Money (weeks 5–6)

**Goal:** Trust Gate live with auto-clear + escalation; credits verify and redeem (mock); e-waste legally routed; offers and scheduling complete the marketplace.

| Ticket | What it delivers | Blocked by |
|---|---|---|
| **TA4** | Report/dispute workflow + moderation queue: report listing/user, dispute on transaction (pauses related credit verification), admin resolve with immutable note, hide/restore/remove listings. | TA2, TB4 |
| **TB5** | Offer flow for recyclables: partner single binding offer, 48h TTL, accept/decline/auto-expire, one active round per listing (no auctions, G9). | TB4 |
| **TB6** | Pickup scheduling + transaction status tracking: schedule proposal/confirm, status timeline (matched → scheduled → collected → verified → completed), notifications at every transition. | TB4, TD4 |
| **TC3** | Agent hardening: monthly spend guard, confidence thresholds, golden-set accuracy CI artifact, rationale quality pass. | TC2 |
| **TC4** | Impact dashboard v1: verified outcomes → weights by material, credits earned, CO₂e via admin-editable factor table; "estimated" wording everywhere. | TD5 |
| **TD5** | **Trust Gate engine**: amendment-A4 signal stack as pure decision function; auto-clear vs escalate; decision records with reasons; escalation queue (evidence bundle + failed signals); verified-weight capture at zone emptying; credit verification on clear. | TD3, TD4 |
| **TD6** | Redemption flow: guards (min ৳300, verified-only, monthly cap ৳50k), redemption-specific signals (velocity, amount vs. history, account age), mock payout with `MOCK-BKASH-<uuid>` reference + honest fee note. Ratify OD-5, OD-6. | TD5 |
| **TD7** | E-waste verified workflow: routing restricted to licensed partners, always-escalate regardless of signals, handover record (photo + pieces/weight + license ref). | TD5, TA2 |

**Key acceptance criteria**
- TD5: exhaustive rule-table tests — every signal combination yields the documented outcome; e-waste auto-clear is impossible even with all-green signals; every verified credit traces to a decision ID; 5% audit sampling deterministic under seeded RNG.
- TD6: redemption below ৳300 / above verified balance / above monthly cap each blocked with clear messaging; escalation path works for velocity anomaly; paid(mock) writes reference + fee disclosure.
- TD7: e-waste task refuses assignment to non-licensed partner (invariant); handover record mandatory before completion.
- TB5: second concurrent offer round rejected; expiry returns listing to active.
- TA4: dispute on a pickup freezes its pending credits until resolved.

**Sprint 3 exit — V&V gate 3:** *Verification:* Trust Gate rule-table suite exhaustive and green; ledger invariant holds under concurrent-redemption test; all fraud fixtures (duplicate photo, geofence miss, velocity, gallery upload) escalate correctly. *Validation:* auto-clear rate ≥70% on synthetic pilot dataset; admin resolves a seeded escalation in <60 seconds (timed); redemption economics re-checked against A3 (does the credit pool survive the demo dataset?).

---

## Sprint 4 — Engagement & Hardening (weeks 7–8)

**Goal:** retention loop live (impact, leaderboards, badges, campaigns); ratings and completion close the marketplace; privacy hardened; pilot dry-run passed.

| Ticket | What it delivers | Blocked by |
|---|---|---|
| **TA5** | Privacy & account hardening: EXIF-strip verification test, account deletion PII purge (≤30 days), notification depth (campaign/badge/redemption kinds), Bangla labels on primary actions (ratify OD-3). | TA4 |
| **TB7** | Transaction completion + two-sided ratings (once per party, no edits, avg+count displayed); search v2 (keyword + combined filters); listing expiry TTL job. | TB6 |
| **TC5** | Leaderboards (individual + institution; weekly/monthly/all-time; nightly materialization; opt-out) + badges/milestones + admin campaigns with credit multipliers recorded on the CreditTxn. | TC4 |
| **TC6** | Impact dashboard v2: downstream destinations per category, shareable impact summary, campaign history. | TC5 |
| **TD8** | Trust Gate tuning pass: threshold config UI (no-deploy tuning), audit-queue ergonomics, redemption polish, load spot-check (100 concurrent deposits, no duplicate grants). | TD6, TD7 |
| **T1** (ALL) | End-to-end V&V + pilot dry-run: golden-path E2E per role, fraud fixture suite, demo script, pilot checklist (partners onboarded, zone posters printed, rate card market-checked, metrics instrumentation for A7 targets verified). | TA5, TB7, TC6, TD8 |

**Key acceptance criteria**
- TC5: leaderboard windows compute from verified ledger only; opted-out user hidden publicly; campaign 2× multiplier lands on CreditTxn with campaign ref; badge rules fire only on verified events.
- TB7: rating blocked pre-completion and on second attempt; expired listings leave feeds.
- TD8: threshold change via config takes effect without deploy; concurrent-deposit test shows zero duplicate credit grants.
- T1: A7 metrics are measurable (activation funnel, auto-clear rate, fraud slip-through, latency) — instrumentation event list agreed and emitted.

**Sprint 4 exit — V&V gate 4 (MVP gate):** *Verification:* full E2E green per role; verification-loop report (build/types/lint/tests/security/diff) clean; coverage ≥80% on Trust Gate + wallet modules. *Validation:* pilot dry-run at the target campus with a real zone poster and real users; A7 success-metric dashboard shows pilot-ready instrumentation; go/no-go checklist signed by all four members.

---

## Feature traceability (all 25 PRD features)

| PRD feature | Ticket(s) | Sprint |
|---|---|---|
| 1 Signup/login/profile | TA1 | 1 |
| 2 Role-based access | TA1 | 1 |
| 3 Partner registration + verification | TA2 | 1 |
| 4 Location & pickup-area setup | TA3 | 2 |
| 5 Notifications | TA3, TA5 | 2, 4 |
| 6 Report/dispute + moderation | TA4 | 3 |
| 7 Create listing | TB1 | 1 |
| 8 Five-path selection | TB3 | 2 |
| 9 Nine categories | TB1 | 1 |
| 10 Browse/search/filters | TB2, TB7 | 1, 4 |
| 11 Buy-now / collection request | TB4 | 2 |
| 12 Offer/bid flow | TB5 | 3 |
| 13 Pickup scheduling + status | TB6 (+TD4) | 3 |
| 14 Completion + rating | TB7 | 4 |
| 15 Next-Life Agent | TC2, TC3 | 2, 3 |
| 16 Rate-card console | TC1 | 1 |
| 17 Impact dashboard | TC4, TC6 | 3, 4 |
| 18 E-waste verified workflow | TD7 | 3 |
| 19 QR drop-zone generation | TD2 | 1 |
| 20 QR deposit scan + record | TD3 | 2 |
| 21 Pickup tasks + Trust Gate | TD4, TD5 | 2, 3 |
| 22 Wallet + ledger | TD1, TD5 | 1, 3 |
| 23 Redemption + assisted approval | TD6 | 3 |
| 24 Leaderboards | TC5 | 4 |
| 25 Badges/milestones/campaigns | TC5 | 4 |

---

## Schedule risks & mitigations

1. **TD5 (Trust Gate) is the critical path** — TC4, TD6, TD7 depend on it. Mitigation: rule-table tests written *first* (TDD); Member C pairs if it slips >2 days.
2. **TC2 (Agent) provider surprises** — vision quality on low-end phone photos is empirical. Mitigation: golden set assembled in week 3 from real ৳10k-phone photos, not stock images; manual fallback already specced.
3. **Sprint 3 load on Member D** — TD5+TD6+TD7 in one sprint is the heaviest load. Mitigation: TD6/TD7 are thin once TD5's decision record exists; Member A takes TA4 solo so Member C stays free to pair.
4. **Real-world dependencies (partner onboarding, campus permission)** are human, not code. Mitigation: start partner/campus outreach in Sprint 1 in parallel (team lead owns; not a dev ticket).
