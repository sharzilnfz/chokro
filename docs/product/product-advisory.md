# Product Advisory — What Would Make Chokro Actually Valuable

**Written:** 2026-08-20 · against `feat/sprint-2-integrated`
**Companion to:** the build specs in `../specs/build/`
**Mode:** evaluate. Claims are labelled **[verified]** (checked against the code or an existing research doc) or **[judgment]** (my assessment, yours to decide).

---

## 1. The one-sentence assessment

**[judgment]** Chokro is currently an impressive *valuation and dispatch* system attached to a circular economy that does not circulate. The engineering quality is genuinely high — the deep-module layering, the single persistence seam, the degraded-mode fallback on every external integration, the sealed-reserve auction, the eligibility-audited dispatch — and it is all pointed at a loop with no closing arc. Fixing that is not a feature; it is the difference between a portfolio piece and a product.

**[verified]** The evidence, from the code: no code path anywhere writes an `EARN` credit. The only writer to the credit ledger is an admin adjustment that is `VERIFIED` on insert. The QR scanner screen states in its own copy that it "does not create a deposit or Green Credits." A Pickup Task terminates at `COLLECTED` with no credit, no custody record and no wallet movement. `REDEEM` has no writer and no route.

---

## 2. What is genuinely good and should not be touched

Worth stating plainly, because the rest of this document is critique and the ratio would otherwise mislead.

1. **[verified] The degraded-mode discipline.** Every external integration has a real fallback chain — vision falls Gemini → OpenAI → keyword heuristic; distance falls Mapbox → OSRM → haversine; FX falls to a constant; realtime falls to polling. Most student projects have one API key and a crash. This is production instinct and it is the single most defensible thing in the repo at a viva.
2. **[verified] The sealed reserve is masked at the serialization boundary**, not at the handler. That is the correct place — it means no future endpoint can accidentally leak it. It is a small decision that shows real judgment.
3. **[verified] Dispatch produces an eligibility audit** — every skipped partner with a named reason (`E_WASTE_LICENSE_REQUIRED`, `OUT_OF_RADIUS`, `INSUFFICIENT_CAPACITY`). Explainable dispatch is rarer than optimal dispatch and worth more in a demo.
4. **[verified] The append-only ledger shape is right** even though nothing writes to it — balance is derived, never stored. Getting this wrong is expensive to undo later; it was gotten right early.
5. **[verified] The competitive analysis in `competitive-analysis.md` is real research**, cross-checked across sources, with unverifiable claims marked. Its conclusion — that the true competitor is "call the bhangari-wala," not another app — is correct and most of this advisory follows from it.

---

## 3. The five changes that would actually move market value

Ordered by value per unit of effort. **[judgment]** throughout, grounded in the verified findings above.

### 3.1 Close the loop — deposit → verified credit → payout

This is the build specs, so I will not restate them. The point to internalise: **until money leaves the system, every other feature is rhetorical.** The valuation engine's entire argument is "the informal chain underpays you." A platform that makes that argument and then cannot pay has asked users to accept a worse deal in exchange for a nicer interface. The van-wala pays cash, in the hand, today.

### 3.2 Sell the e-waste compliance report — this is the wedge

**[judgment]** This is the highest-value idea in this document and it is nearly free.

An institution in Dhaka that disposes of two hundred laptops has a legal obligation under the E-Waste Management Rules 2021 and no credible way to evidence it. What they have today is a receipt from a scrap dealer with no name on it. After the Trust Gate ships, Chokro holds something nobody else does: per-item disposal records with a photograph, a verified quantity, a named licensed downstream destination with its licence reference, and a human review decision — for every single e-waste item, because the platform already forces e-waste through mandatory human review.

**[verified]** The licence gate exists in the dispatch code today. The mandatory e-waste escalation is already a stated invariant. The report is a query over records the platform will already hold.

Why this beats general sustainability reporting as a first sale: it is a **legal obligation** rather than a nice-to-have, it has a **named budget holder**, the buyer is **already looking**, and the alternative is visibly inadequate. General ESG reporting is a want; compliance evidence is a need.

**[judgment]** If I had to pick one thing to build after SPEC 12, it would be this — before redemption, before anything else. It is the fastest path to a sentence like "a real institution is using this."

### 3.3 Make the rationale the product, not the classification

**[verified]** The competitive analysis found that cross-path reasoning is *genuinely unoccupied white space* — every competitor forces one path per category, and nobody looks at one photo and reasons "repair beats recycle, here's why."

**[verified]** The code already generates a rationale, a Next-Life Path and a suggested action. **[judgment]** But it is currently presented as a byproduct of classification, when it is the only part a competitor cannot copy in a quarter. Photo-to-category is commoditised — Bower ships it free in 170 countries.

Concretely, three changes:

- **Show the paths not taken.** "Repair — ৳900 after a ৳400 fix at [named shop] 2km away. Recycling this instead gets you ৳180." That comparison *is* the product. Right now the user sees one answer with a rationale attached.
- **Make repair a real path with real supply.** `REPAIR_SHOP` is already a partner type. A repair recommendation that ends in a named shop that can be booked is worth more than one that ends in advice, and it is the highest-value disposal outcome for the user.
- **Name the destination.** The competitive analysis flags TerraCycle's greenwashing collapse as a design constraint. "Your bottles go to [named recycler]" is cheap to build and directly buys the trust that competitor lost.

### 3.4 Compete on certainty, not on price

**[verified]** The strongest finding in the competitive research: ecoATM pays *below* resale value and wins anyway, because it pays instantly and certainly. Cashify's instant quote plus doorstep verification is the same pattern.

**[judgment]** The current design competes on price — the benchmark engine's whole story is "here is the real market value." That is the wrong axis. The van-wala's advantage is not price, it is that they are at your door and they pay now. Beating that requires:

- **A guaranteed price window.** "This quote is locked for 7 days" (ecoATM's exact mechanic). The rate card's effective-dating already makes this trivially implementable — a quote references its rate entry.
- **A stated pickup window at booking**, not a status the user polls. Dispatch already computes ETAs.
- **Fast verification, visibly.** The auto-clear rate is the metric that decides whether this feels instant or bureaucratic. Watch it from day one of any pilot.

### 3.5 Pick one campus and go deep, not four features and go wide

**[judgment]** The feature slate has sixteen features across four members. That is a course requirement and it is fine. But if the goal is a product with real market value, the sixteen-feature surface is the enemy: one campus with working zones, a real contracted collector, a funded credit pool and one sustainability officer who has an actual certificate in hand is worth more — commercially and in a viva — than sixteen features nobody has used.

**[verified]** The competitive analysis supports this: Recykal abandoned its consumer marketplace within two years and pivoted to B2B; Kabadiwala stayed small on consumer cash alone. Consumer-only models in this category do not survive.

---

## 4. Risks I would flag whether or not you asked

### 4.1 The hardcoded price fallback is a live marks risk

**[verified]** `ValuationDomain.getDefaultPrice` embeds a constant per-category price table (PLASTICS 45, METAL 110, APPLIANCES 500, E_WASTE 250 …) used whenever no rate card row matches. **[verified]** The course rubric scores hardcoding at zero.

This is the single most exposed line in the repository. It is also a product defect independent of marks: it means the platform will confidently quote a price it has no basis for. SPEC 10 removes it. **[judgment]** I would fix this before anything else in this document — it is an afternoon's work and it is currently sitting in the feature you are personally defending.

### 4.2 The bid race falsifies your own innovation claim

**[verified]** Bid sequence numbers are read and then written without serialisation. Two simultaneous bids can be assigned the same number.

**[judgment]** The problem is not that the race is likely in a demo — it is not. The problem is that "server-authoritative bid ordering" is the stated innovation for that feature, and an examiner who asks "what happens if two bids arrive at once?" has found the answer in one question. Fix it and the claim becomes true and demonstrable — a concurrent-bid test is a much better answer than a confident explanation.

### 4.3 Every constraint violation looks like an outage

**[verified]** The persistence seam collapses all driver errors into a single unavailable condition, surfacing as 503.

**[judgment]** This is fine today because nothing has interesting constraints. It becomes actively dangerous in SPEC 13: a concurrent redemption that correctly loses a race must be distinguishable from a database that fell over, or you cannot tell a working guard from a broken one — including in your own tests.

### 4.4 The test harness will silently rot

**[verified]** The harness hand-mirrors all nineteen tables as raw DDL and re-lists them in a truncation statement. The build specs add roughly twenty more tables. Each needs adding in two places, and a divergence between harness DDL and real schema fails silently or, worse, passes wrongly.

### 4.5 The manifest and the product direction openly contradict each other

**[verified]** `docs/specs/00-product-capability.md` lists auctions, escrow, chain-of-custody and live route optimisation as explicit **non-goals**, and states that when other specs disagree with it, it wins. The product handover builds all four, and they are merged and working.

**[judgment]** Right now the team is operating with two authoritative documents that disagree, and the disagreement is being resolved silently in each pull request. SPEC 10 resolves it in writing (handover wins on scope, manifest wins on invariants), but somebody should amend the manifest's non-goal list rather than leave a ratified document that the code contradicts.

---

## 5. Features I would drop or defer

**[judgment]**, and the reasoning matters more than the verdicts.

- **The leaderboard and badges are table stakes, not differentiators.** **[verified]** The competitive analysis says exactly this. They are built and working — keep them, they are cheap retention. Do not pitch them as the innovation, and do not invest further in them.
- **Negotiation chat (Group C Option 7) is the weakest item on the menu.** It re-solves what Bikroy already does well, on a platform whose entire premise is that a published rate card removes the need to haggle. It also fights the valuation engine directly.
- **The reverse marketplace (Group C Option 6) needs demand-side density that a pilot will not have.** A "wanted scrap" board with three recyclers and no listings is an empty room, and empty rooms are worse than absent features.
- **SMS price alerts (Group D Option 9) solve a problem nobody has.** Households do not time the scrap market. Recyclers do, and they are already in the auction.
- **Duplicate route namespace.** **[verified]** The `/api/v1` tree is currently one-line re-exports of the unversioned handlers — so there is no logic drift *today*. **[judgment]** Two names for one surface with partial coverage is an invitation for drift. Pick `/api/v1`, migrate the mobile client, delete the other.

---

## 6. What I would do in the next two weeks

**[judgment]** Sequenced for maximum value if you build nothing else:

| # | Work | Why now |
|---|---|---|
| 1 | Remove the hardcoded price fallback | Live marks risk, one afternoon, in your own feature |
| 2 | Serialise bid sequence assignment | Makes a stated innovation claim true |
| 3 | Error taxonomy at the persistence seam | Prerequisite for every guard test that follows |
| 4 | Deposit session → deposit → pending credit (SPEC 11) | The loop closes on the user's side |
| 5 | Trust Gate as a pure function (SPEC 12) | The loop closes on the platform's side — **this is the milestone** |
| 6 | E-waste compliance report (SPEC 14, narrow slice) | The commercial wedge, and it is nearly free by this point |

**[judgment]** Items 1–3 are correctness debt and take days, not weeks. Items 4–5 are the actual product. Item 6 is the one that lets you say a real institution wants this.

Redemption and payout (SPEC 13) matter enormously for the product and can wait two weeks longer than this list, because a verified credit that cannot yet be withdrawn still demonstrates a closed loop — an unverified credit does not.

---

## 7. The honest summary

**[judgment]** You asked what would make this a good product with real market value. Three things, in order:

1. **Make the loop close.** Everything else is downstream of a user putting material in and getting money out. Right now that path does not exist, and no amount of feature surface substitutes for it.
2. **Sell compliance evidence, not sustainability sentiment.** The e-waste report is a legal need with a budget holder attached, and you are ninety percent of the way to it without knowing it.
3. **Compete on certainty against the van-wala, not on price against a competitor that does not exist.** Locked quotes, stated pickup windows, fast visible verification. The competitive research already told you this; the product does not yet act on it.

The engineering is not the problem here. The engineering is better than it needs to be. What is missing is the arc that turns four good features into one system that does something for someone.
