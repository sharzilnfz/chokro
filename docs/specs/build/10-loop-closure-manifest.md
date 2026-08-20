# SPEC 10 — Loop Closure Manifest & Correctness Debt

**Status:** build spec · derived from `../00-product-capability.md` (ratified baseline) and `../../planning/feature-slate.md`
**Depends on:** nothing — this is the spine
**Blocks:** SPEC 11, 12, 13, 14

---

## Problem Statement

Chokro looks finished and is not. A user can photograph a broken kettle, get a category, a condition band, a Next-Life Path and a taka value benchmarked against a live copper quote. They can book a pickup and watch the platform pick the nearest licensed collector with enough remaining vehicle capacity. They can scan a Drop Zone poster and see the zone come back with its accepted categories. A recycler can bid on a bulk lot and watch the price move in real time.

And then nothing happens. The QR Scanner screen tells the user so in its own copy: it recognises a zone but "does not create a deposit or Green Credits". A Pickup Task reaches `COLLECTED` and stops — no credit, no custody record, no wallet movement. The credit ledger has three transaction kinds and exactly one writer: an admin manually inserting an `ADJUST` row that is `VERIFIED` the instant it is written. Nothing in the codebase has ever written an `EARN` credit outside a test fixture. The Green Wallet is a screen that displays a number nobody can earn and nobody can withdraw.

So the loop is open at both ends. Material never verifiably moves — the platform takes the user's word for everything and then rewards them with nothing. Money never leaves — there is no redemption, no payout, no cash-out. The product currently demonstrates *valuation and dispatch*; it does not demonstrate a circular economy, because the circle has no closing arc. The four external integrations are real and the fallbacks work, but they decorate a system whose central promise — put your scrap into the loop and get paid for it — is unimplemented.

Worse, three of the invariants the ratified baseline calls non-negotiable are currently unenforceable, because the entities they constrain do not exist: "a credit transaction reaches VERIFIED only via a Trust Gate decision record", "every credit-granting event references exactly one verified deposit or Pickup Task", "every credit movement is reconstructable from the ledger plus decision records". There is no Trust Decision table to reference.

Alongside the missing loop there is a smaller set of correctness defects that will fail either a marks rubric or a first real user, and that every downstream spec inherits if not fixed first.

## Solution

Close the loop with three new subsystems and fix the correctness debt underneath them.

The loop closes along one path, and every other path merges into it: **material enters custody, custody produces evidence, evidence passes a Trust Gate, a passed gate mints a verified Green Credit, and a verified balance can leave the system as a payout.** A Deposit at a Drop Zone and a completed Pickup Task are two entrances to the same corridor; a settled Auction Lot is a third. All three converge on one verification step and one append-only ledger.

This spec owns the spine: the reconciled invariants every downstream spec must hold, the resolution of a live conflict between the ratified baseline and the current product direction, the shared vocabulary for the new entities, and the correctness debt that must be paid before the new work lands on top of it.

It also owns one decision that shapes everything else: **the Trust Gate is a pure function.** It takes a subject and a signal bundle and returns a decision. It reads no database, calls no network, and has no clock of its own. Every fraud rule in the product becomes a row in a truth table rather than a branch buried in a request handler — which is what makes the fraud surface testable at all.

### The conflict this spec resolves

The ratified capability manifest lists auctions, escrow, chain-of-custody and live route optimisation as explicit **non-goals**. The later product handover builds all four, and they are already merged and working. The manifest also says that when the capability specs disagree with it, it wins.

**Resolution: the handover supersedes the manifest on scope, and the manifest keeps authority on invariants.** The pivot from classifieds to reverse-logistics network was a deliberate product decision taken after the manifest was ratified, and the code reflects it. What does *not* get superseded is the manifest's trust model — auctions and custody must obey the same append-only ledger, the same Trust Gate, and the same "credits are never granted on user claims" rule as deposits do. Scope grew; the invariants did not loosen. Every downstream spec is written against that reading, and the manifest's non-goal list should be amended rather than quietly ignored.

## User Stories

1. As a product owner, I want one written statement of where the circular loop is broken, so that the team stops shipping features that decorate an open loop.
2. As a developer, I want a single reconciled invariant list, so that I know which rules my slice must not violate.
3. As a developer, I want the conflict between the ratified manifest and the current product direction resolved in writing, so that I am not choosing between two authoritative documents in a pull request.
4. As a developer, I want the vocabulary for the new entities fixed before anyone builds them, so that four people do not invent four names for a verification decision.
5. As a developer, I want the correctness debt listed and owned, so that new subsystems are not built on top of a hardcoded price table.
6. As an examiner, I want to see that a valuation from three months ago can still be reproduced, so that I believe the rate card is genuinely effective-dated rather than overwritten.
7. As a user, I want a Drop Zone lookup by my coordinates to return the zone I am actually standing next to, so that the nearest-zone feature is real.
8. As a user, I want the photo I submitted as evidence to be the photo that is stored, so that a dispute can be settled by looking at it.
9. As an examiner, I want no category price to come from a constant embedded in the source, so that the pricing engine passes the no-hardcoding rule.
10. As a recycler, I want two bids placed in the same instant to receive distinct sequence numbers, so that "server-authoritative bid ordering" is a true claim.
11. As a developer, I want a database constraint violation to surface as a client error rather than a service outage, so that I can tell a bad request from a broken database.
12. As a developer, I want the test harness schema derived from the real schema, so that adding a table does not silently break every test in the suite.
13. As an operator, I want the API to stop advertising itself to every origin on the internet, so that a browser-based caller cannot read authenticated responses cross-site.
14. As a developer, I want one API namespace, so that I do not have to remember which endpoints exist in two places.
15. As a collector with a long task list, I want dispatch selection to stay fast as the partner count grows, so that booking a pickup does not slow down linearly with the network.

## Implementation Decisions

### Reconciled invariants (every downstream spec must hold these)

1. The credit ledger is **append-only**. No row is ever updated except its status field moving `PENDING → VERIFIED` or `PENDING → REJECTED`, exactly once, and only as the recorded effect of a Trust Decision. Balances are always derived by summation, never stored.
2. A credit transaction reaches `VERIFIED` **only** by referencing a Trust Decision. A verified credit with a null decision reference is a corrupt row.
3. Every `EARN` credit references exactly one custody event — one Deposit or one completed Pickup Task. Two credits may never reference the same custody event.
4. Credits are computed from **verified quantity**, never from user-declared quantity. Declared quantity is retained only as a fraud signal (declared-versus-verified divergence).
5. `E_WASTE` items always escalate to a human, regardless of confidence or signal cleanliness. This is a legal invariant, not a tuning parameter.
6. `E_WASTE` custody may only be assigned to a partner holding the e-waste licence flag.
7. The dual-unit rule is single-sourced from the shared package: `APPLIANCES` and `E_WASTE` are priced per `piece`, everything else per `kg`. No slice re-derives this.
8. `REDEEM` reduces only the verified balance. Pending credits are never redeemable, and the derived balance may never go negative.
9. Rate card entries are **superseded, never overwritten**. Every stored valuation records the rate card entry it used, so a past valuation is reproducible by identifier rather than by re-deriving today's price.

### Vocabulary (fixed here, used everywhere)

**Deposit Session** — a short-lived, single-use authorisation created when a user scans a Drop Zone, binding one user to one zone for a bounded window. **Deposit** — a recorded drop-off, closing a Deposit Session with an evidence bundle. **Custody Handover** — the two-sided confirmation transferring material from a user to a partner at a Pickup Task. **Evidence Bundle** — the capture-time photo, declared quantity, category and location signals attached to a custody event. **Trust Signal** — one named boolean or scalar input to the gate. **Trust Decision** — the gate's recorded output: `AUTO_CLEAR` or `ESCALATE`, plus the failing signal names and who decided. **Escalation Queue** — the admin worklist of escalated decisions. **Fraud Flag** — a persisted marker on a user or partner raised by a failed signal, independent of the decision it came from. **Redemption** — a user's request to convert verified Green Credits to money. **Payout** — the settlement record for a Redemption. **Impact Record** — the mass-and-carbon consequence of a verified custody event.

Existing vocabulary from the shared package and the ratified glossary is not renamed. `Drop Zone`, `Pickup Task`, `Green Credit`, `Rate Card`, `Next-Life Path`, `Listing`, `Auction Lot` keep their current meanings.

### Canonical state machines for the new entities

```
DepositSession:  OPEN → CONSUMED          (a Deposit closes it)
                      → EXPIRED           (window elapsed, single-use, no Deposit)

Deposit:         RECORDED → VERIFIED      (Trust Decision AUTO_CLEAR)
                          → ESCALATED → VERIFIED | REJECTED   (human decision)

CustodyHandover: PENDING → CONFIRMED      (both parties, code matched)
                         → FAILED         (code mismatch or expiry)

CreditTxn:       PENDING → VERIFIED | REJECTED    (only via Trust Decision)

Redemption:      REQUESTED → AUTO_APPROVED → PAID
                           → ESCALATED → APPROVED → PAID
                                       → REJECTED
```

Transitions are enforced by an explicit transition table in the owning domain module, in the same shape as the existing Pickup Task state machine, so an illegal transition is rejected at the domain boundary rather than at the handler.

### Correctness debt owned by this spec

- **Rate card fallback removal.** The valuation domain currently falls back to a constant table of per-category base prices when no rate card entry matches. This is deleted. A missing rate card entry is an explicit, surfaced condition — the response carries the classification, the Next-Life Path and the rationale, and states that no published rate applies, rather than inventing a price. The seed dataset is responsible for there being no empty screen; the pricing engine is not.
- **Evidence storage.** The valuation scan currently persists a literal placeholder string in place of the submitted image. Evidence capture becomes real: the submitted image is stored and the stored reference is what the record points at. A single storage boundary is introduced with one implementation and a local filesystem fallback for offline demo, because evidence is the input to every dispute in SPEC 12 and 13 and a placeholder makes disputes unresolvable.
- **Drop Zone resolution by location.** The coordinate branch of zone resolution currently ignores the coordinates and returns the first active zone. It becomes a real nearest-zone query using the same haversine distance already used by dispatch, bounded by a maximum proximity, returning no zone rather than a wrong zone when nothing is close enough.
- **Bid sequence serialisation.** Bid sequence numbers are currently read and then written without serialisation, so two simultaneous bids can be assigned the same number — which falsifies the auction's central innovation claim. Sequence assignment moves inside a single serialised database operation, and a uniqueness constraint on lot-plus-sequence makes a collision a hard failure rather than silent corruption.
- **Error taxonomy at the persistence seam.** The persistence seam currently collapses every driver error into a single "database unavailable" condition, which surfaces as a 503. A unique-constraint violation therefore looks like an outage. The seam gains a narrow classification: constraint violations become a distinct conflict condition mapped to 409, check violations to 400, and genuine connectivity failures remain 503. The seam keeps its current narrow interface — this is a change to what it throws, not to how it is called.
- **Test harness schema derivation.** The harness re-declares every table as hand-written DDL and re-lists every table in a truncation statement, so the ~21 new tables in this programme would each need adding in two places, and a divergence between harness DDL and real schema is silent. The harness derives its schema from the schema definition instead, and derives its reset list from the same source.
- **Namespace consolidation.** The versioned namespace is already implemented as one-line re-exports of the unversioned handlers, so there is no logic drift — but coverage is partial and the two names invite it. The versioned namespace becomes the complete public surface; the unversioned paths remain as re-exports for the existing mobile client until it is migrated, then are removed.
- **CORS.** The wildcard origin is replaced by an allowlist read from configuration, defaulting to the local development origins. Authenticated responses stop being readable by arbitrary origins.
- **Dispatch query shape.** Collector selection issues one active-task query per candidate partner inside its loop. It becomes a single aggregate query over the candidate set. The eligibility audit trail — the per-partner skip reasons that make dispatch explainable — is preserved exactly, because it is the feature's innovation evidence.

### What this spec does not change

The four external integrations and their degraded-mode fallbacks stay as they are: they are correct, and each fallback is exercised by removing its key. The deep-module layering — domain modules holding rules, repositories holding persistence behind the single database seam, handlers staying thin — is the pattern all new work follows. The thin single-implementation service facades are left alone; deleting them is churn without benefit while their call sites are stable.

## Testing Decisions

A good test here asserts **externally observable behaviour**: a request in, a response and a set of database rows out. It never asserts that a particular internal function was called, and it never reaches into a module's private state. If a test would still pass after the feature was deleted and the assertion inverted, it is testing the wrong thing.

**Seam:** the existing one. Tests import route handlers directly and invoke them with a constructed Request against PGlite, using the established harness for schema setup, store reset, user creation and auth headers. Prior art: the dispatch test suite books a pickup through the real handler and asserts that the nearest eligible collector was chosen and a dispatch row written; the rate card and valuation suites drive their handlers the same way. No new seam is introduced by this spec.

Modules covered:

- **Rate card effectivity.** Publish a rate, capture a valuation, publish a superseding rate, and assert the first valuation still resolves to the original entry and the original price. This is the test that defends the rate card against the banned-standalone-feature rule, so it is written first and named for what it defends.
- **Missing rate.** With no published entry for a category, assert the valuation response succeeds with classification and path but carries no price, and assert no constant price appears anywhere in the response.
- **Zone resolution.** Seed three zones at known coordinates and assert the nearest is returned; assert a coordinate far from all zones returns no zone rather than the first active one.
- **Evidence.** Submit an image and assert the persisted record references retrievable stored evidence, not a placeholder.
- **Bid serialisation.** Fire concurrent bids at one lot with `Promise.all` and assert sequence numbers are distinct and contiguous, and that exactly one bid at each price level survives. This is the one place the seam is driven in parallel rather than sequentially.
- **Error taxonomy.** Provoke a unique-constraint violation through a handler and assert 409; provoke an unavailable database and assert 503. These must be distinguishable from outside.
- **Harness derivation.** A meta-test asserting that every table in the schema definition is present in the harness-created database, so the next new table cannot silently escape the reset list.

PGlite has no PostGIS, so all distance work is haversine in plain SQL or TypeScript — verified constraint, already respected by dispatch, and the reason zone resolution reuses that path rather than introducing a spatial index.

## Out of Scope

Real payment disbursement; a hosted object storage account (the storage boundary is introduced with a local implementation, and swapping it is a configuration change); IoT fill sensors; individual-collector accounts; certified carbon accounting; custom-trained vision models; live price scraping; migrating the mobile client off the unversioned namespace; deleting the service facade layer; internationalisation; and the new subsystems themselves, which are owned by SPEC 11 through 14.

## Further Notes

The correctness-debt list is deliberately in this spec rather than distributed across the others, because each item is small, none is independently demo-worthy, and every one of them is a precondition for a downstream slice: SPEC 12's disputes are unresolvable without real evidence, SPEC 11's nearest-zone flow needs real zone resolution, and SPEC 13's concurrent-redemption test needs an error taxonomy that distinguishes a conflict from an outage.

The hardcoded-price fallback deserves particular attention. It is currently the single largest marks risk in the repository: the rubric scores hardcoding at zero, and a constant table of category prices used whenever the database has no matching row is precisely the pattern the rule targets. It is also a product defect — it means the platform will quote a confident price it has no basis for.

The pure-function shape of the Trust Gate is the highest-leverage decision in this programme. Fraud rules that live inside request handlers can only be tested by constructing the world that produces each signal; fraud rules behind a pure function can be tested as a table. The ratified baseline already identified this. SPEC 12 depends on it.
