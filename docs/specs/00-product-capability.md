# SPEC 00 — Product Capability Manifest

**Status:** ratified baseline for all capability specs (01–04) and the sprint plan
**Method:** product-capability lane (PRD → implementation constraints). Derived from `chokro-IDEAS.txt` + amendments A1–A10 (`docs/prd-review.md`).
**Rule for the team:** when specs 01–04 disagree with this file, this file wins. Open decisions (OD-x) are listed in §10 — do not improvise answers to them in code.

---

## 1. CAPABILITY

Chokro lets a user in Bangladesh photograph an unwanted item, receive a reasoned recommendation for its best next life (reuse / donate / repair / resell / recycle) with an estimated value from a published rate card, act on that recommendation through a marketplace, a partner, or a campus QR drop zone, and earn Green Credits that are verified automatically when signals are clean and by a human only when they are not. After this ships, a 4-person team can run a one-campus pilot where disposal outcomes are verified, rewarded, and auditable without scaling admin headcount with users.

---

## 2. CONSTRAINTS (fixed policy — do not relitigate in PRs)

1. **Five paths only:** Reuse, Donate, Repair, Resell, Recycle. Every item resolves to exactly one final path.
2. **AI advises, humans decide value.** The Next-Life Agent determines category and recommends path + *suggested* condition + value range. **Final condition and price are confirmed by a human** (collector/partner) at pickup/deposit (A1).
3. **Credits are never granted on user claims.** Credits exist only as `pending` until a Trust-Gate-verified pickup or deposit confirms them (PRD F22).
4. **E-waste and hazardous items ALWAYS escalate to a human**, regardless of AI confidence (PRD exclusion — safety-critical invariant).
5. **E-waste partners must hold a DoE license** (E-Waste Management Rules 2021). License document captured at onboarding; no license → no e-waste capability flag.
6. **Trust Gate auto-clears only when the full signal stack passes** (A4). Any single failure → escalation queue. 5% of auto-cleared actions are randomly audited by a human.
7. **Published rate card is the only pricing source.** No live scraping. Admin reviews weekly. Materials priced per kg; e-waste/appliances per piece with condition bands (A2).
8. **Mock money at MVP.** Redemption produces a mock bKash payout record with honest fee disclosure (A3). No real disbursement integration.
9. **Photo hygiene:** camera-only capture for verification-relevant evidence, EXIF/GPS stripped server-side after the geofence check, evidence retained max 90 days post-verification (A9).
10. **Decentralized logistics only.** The platform never warehouses items (ThredUp lesson). Items move user→partner, user→buyer, or user→drop zone→partner.

### Invariants (must hold at every commit)

- Wallet balance = sum of ledger entries (ledger is append-only; balances are derived, never mutated).
- A credit transaction reaches `verified` only via a Trust Gate decision record (auto or human) — traceable by ID.
- Every credit-granting event references exactly one verified pickup or deposit.
- A listing can leave `active` only through `matched`, `cancelled`, or `expired`.
- E-waste-category items can be assigned only to partners whose `e_waste_licensed` flag is true.

---

## 3. Actors

| Actor | Description | App surface |
|---|---|---|
| **Individual** | Household/student user; can be both giver and buyer | Mobile app |
| **Institution member** | Individual linked to a campus/org (affects leaderboards, zone access) | Mobile app |
| **Partner** | Verified *organization*: collector, recycler, repair shop, vendor, or NGO. Capability flags per type | Mobile app (thin: task list, confirm, history) |
| **Admin** | Platform operator: verifies partners, runs Trust Gate escalation queue, manages rate card, moderates | Web admin console |
| **Next-Life Agent** (system) | AI pipeline: photo → category + suggested condition + value range + path recommendation + rationale | Server pipeline |
| **Trust Gate** (system) | Verification layer: evaluates signal stack → auto-clear or escalate | Server pipeline |

> A5: there is **no individual-collector actor at MVP**. Pickup work is performed by partner organizations, dispatched by admin out-of-band (phone/WhatsApp). The partner app surface is read-confirm only.

---

## 4. Platform & surfaces (per team decision 2026-08-02: mobile app)

| Surface | Tech | Notes |
|---|---|---|
| Mobile app (individual + partner) | React Native + Expo, TypeScript, Android-first | Expo Camera (photo evidence), Expo QR scanner, push notifications |
| Admin console | Next.js web (same backend codebase) | Rate card, partner verification, Trust Gate queue, moderation, zone registry |
| Backend API | Next.js API routes + PostgreSQL (Prisma) — **OD-2** | REST; JSON; server-side Trust Gate + Next-Life pipelines |
| Image storage | Hosted object storage (e.g., Cloudinary free tier) | Server-side EXIF strip on ingest |
| Vision provider | Multimodal LLM API (Gemini Flash / GPT-4o-mini class) — **OD-4** | Budget: ≤2 calls per listing analysis |

---

## 5. Domain glossary (use these exact terms in code)

**Listing** — an item offered by a user. **Next-Life Path** — reuse/donate/repair/resell/recycle. **Rate Card** — admin price table (category × condition band × unit kg|piece). **Drop Zone** — physical collection point with a printed QR code. **Deposit** — a scanned drop-off at a Drop Zone. **Pickup Task** — a collection job created from a collection-request or a zone-fill. **Trust Gate** — verification layer producing **Decisions** (auto_clear | escalate). **Green Credit** — reward unit, 1 credit = ৳1 (OD-6). **Wallet/Ledger** — per-user credit account + append-only transaction log. **Redemption** — cash-out request (mock bKash). **Escalation Queue** — admin review list. **Downstream Destination** — named endpoint per category shown to users (A6).

---

## 6. Canonical state machines

```
Listing:        draft → active → matched → pickup_scheduled → completed
                  └→ cancelled (from draft/active)   └→ expired (from active, TTL)

Deposit:        scanned(pending) → verified        (auto, Trust Gate clear)
                                 → escalated → verified | rejected   (human)

PickupTask:     created → assigned → en_route → collected → verified | disputed

CreditTxn:      pending → verified | rejected      (verified only via TrustGate decision)
Redemption:     requested → auto_approved → paid(mock)
                          → escalated → approved → paid(mock) | rejected

Partner:        applied → under_review → verified | rejected
                  verified → suspended (admin action, reversible)

Dispute:        opened → under_review → resolved | escalated_to_admin_final

Offer (recyclables):  made → accepted | declined | expired (single round, 48h TTL)
```

---

## 7. Core data model (entities, not schemas — specs own the details)

`User(id, role, institution_id?, phone?, email, created_at, …)`
`Partner(id, org_name, types[], capability_flags{e_waste_licensed, collects, repairs, buys, accepts_donations}, service_areas[], doe_license_doc?, status)`
`Listing(id, owner_id, category, photos[], declared_condition, weight_kg?, unit, path, price?, location, status, agent_analysis_id?)`
`AgentAnalysis(id, listing_id, category, suggested_condition, value_range, recommended_path, rationale, confidence, overridden_by_user?, provider_meta)`
`RateCardEntry(id, category, condition_band, unit(kg|piece), price_bdt, effective_from, updated_by)`
`DropZone(id, institution_id, name, geo, qr_code_id, accepted_categories[], status)`
`Deposit(id, zone_id, user_id, category, photo, declared_weight?, verified_weight?, status, trust_decision_id)`
`PickupTask(id, source(listing|zone), partner_id, schedule, status, evidence_photo?, trust_decision_id)`
`TrustDecision(id, subject_type, subject_id, signals{}, outcome(auto_clear|escalate), decided_by(system|admin_id), created_at)`
`CreditTxn(id, user_id, amount, kind(earn|redeem|adjust), status, source_id, trust_decision_id, created_at)`
`Redemption(id, user_id, amount, status, mock_bkash_ref, trust_decision_id)`
`Offer(id, listing_id, partner_id, amount, expires_at, status)`
`Dispute(id, subject_type, subject_id, opened_by, reason, status, resolution?)`
`Notification(id, user_id, kind, payload, read_at)`
`Badge/Campaign/LeaderboardEntry` (owned by spec 03)
`ImpactFactor(category, co2e_per_kg, …)` — admin-editable heuristic table (G12)

---

## 8. Key interfaces

### Next-Life Agent (server pipeline)
```
input:  { photos[], user_declared_category?, location }
output: { category, suggested_condition(band), value_range_bdt{low,high},
          recommended_path, rationale(≤60 words, user-readable), confidence(0–1) }
rules:  ≤2 vision calls/listing; p95 latency <8s; on provider failure →
        graceful fallback (user picks category manually, agent still routes);
        e-waste/hazardous detected → recommended_path=recycle AND force
        human escalation downstream (invariant §2.4); user may confirm or
        override any field (override recorded on AgentAnalysis).
```

### Trust Gate (server pipeline)
```
input:  subject (Deposit | PickupTask-completion | Redemption) + signals{}
output: TrustDecision(auto_clear | escalate, reasons[])
signals (A4): in-app camera capture, pHash-unique photo, QR-at-zone OR
        geofence match, category match (declared vs vision), verified-weight
        within band, velocity caps (user/day, partner/day), pair history,
        + redemption-only: amount vs history, account age, redemption velocity
rules:  ALL pass → auto_clear; ANY fail → escalate with reasons;
        e-waste/hazardous → always escalate; 5% random audit of auto_clears.
```

### Wallet
```
earn(source)   → CreditTxn(pending)  → TrustDecision → verified (balance+)
redeem(amount) → guard: verified_balance ≥ amount ≥ ৳300, monthly cap ok
               → Redemption(requested) → TrustDecision → paid(mock)
adjust         → admin-only, reason required, appears in ledger
```

---

## 9. Non-functional requirements

- **Devices:** Android 8+ on ৳10k-class hardware; app cold start <3s on 4GB RAM device.
- **Network:** photo upload must tolerate 3 Mbps uplink (client-side downscale to ≤1600px, ≤500KB).
- **Latency:** photo→recommendation p95 <8s; listing feed p95 <1.5s.
- **Privacy:** EXIF/GPS stripped post-geofence-check; account deletion purges PII within 30 days; minors may be present on campus — no public user location.
- **Language:** English UI with Bangla labels on primary actions at pilot (**OD-3**).
- **Auditability:** every credit movement and Trust Gate decision is reconstructable from the ledger + decision records.
- **Cost:** vision API spend ≤ $30/month at pilot scale (budget guard in pipeline).

---

## 10. OPEN QUESTIONS (blocking — owners must ratify before the sprint noted)

| ID | Question | Recommendation | Blocks |
|----|----------|----------------|--------|
| OD-1 | Auth method | Email+password MVP (SMS OTP costs money) | Sprint 1 |
| OD-2 | Backend stack | Next.js API + Prisma (single language/deploy) | Sprint 1 |
| OD-3 | UI language scope | English + Bangla key labels | Sprint 2 |
| OD-4 | Vision provider | Gemini Flash / GPT-4o-mini class | Sprint 2 |
| OD-5 | Pilot credit funding | Campus/sponsor budget (A8) | Sprint 3 |
| OD-6 | Credit economics | 1 credit = ৳1; min cash-out ৳300; monthly cap ৳50k; 12-month expiry | Sprint 3 |

---

## 11. NON-GOALS (this manifest does not own)

- Real bKash disbursement, IoT fill sensors, live route optimization, certified carbon math, custom-trained vision models, auctions/escrow, public impact map, chain-of-custody, voucher portal, multi-language chatbot, live price scraping (PRD exclusions, confirmed).
- Business-model design beyond the institutional-payer requirement (A8).
- Post-pilot scaling strategy.

---

## 12. HANDOFF

- **Ready for implementation** against specs 01–04 once OD-1 and OD-2 are ratified (Sprint 1, day 1).
- Spec ownership: **Member A → spec 01** (Identity & Trust) · **Member B → spec 02** (Marketplace) · **Member C → spec 03** (Intelligence & Engagement) · **Member D → spec 04** (Collections & Wallet).
- Execution order + tickets: `docs/sprint-plan.md`.
- During build: use `tdd-workflow` per ticket; run `verification-loop` before every merge; V&V gates per sprint are defined in the sprint plan §6.
