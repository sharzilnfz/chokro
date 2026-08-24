# SPEC 13 — Wallet Settlement: Redemption, Payout, Auction Escrow & Dispute Arbitration

**Status:** build spec
**Depends on:** SPEC 10 (invariants, error taxonomy, bid serialisation), SPEC 12 (only verified credits are redeemable; the gate is reused for redemption signals)
**Blocks:** nothing — this is the far end of the loop
**Maps to:** feature slate Group B Options 3 and 4 · ratified baseline SPEC 04 stories 22–27

---

## Problem Statement

Follow the money and it stops immediately. The credit ledger has three kinds — earn, redeem, adjust — and after SPEC 11 and 12 land, two of them are live. `REDEEM` has no writer and no route. A user who has diverted forty kilograms of material, passed the Trust Gate every time, and accumulated a verified balance has no way to convert any of it into anything. The wallet screen displays a number that behaves like a score.

That is not a missing convenience. It is the difference between a rewards gimmick and a circular economy: the informal chain Chokro replaces pays cash on the spot, in the hand, immediately. A platform that offers a better price and then cannot pay it has not competed with the van-wala — it has asked people to accept a worse deal in exchange for a nicer interface. The whole valuation engine, every commodity benchmark, the entire argument that users are being underpaid by the informal market, is rhetorical until a taka leaves the system.

The business side has the mirror problem. A recycler can bid on a bulk lot, the auction closes, a winner is determined against a sealed reserve, and then the record simply sits there. No funds are committed, so a winning bidder can walk away at zero cost and the seller has spent a week's inventory planning on a promise. No inspection step, so a seller who described a lot as high-purity copper and delivers contaminated mixed metal faces no consequence and the buyer has no recourse. No arbitration, so the first serious disagreement between two businesses on this platform ends in a phone call the platform knows nothing about. Nothing that makes a business-to-business auction trustworthy exists — only the bidding mechanics, which are the easy part.

There is also an unenforced constraint sitting underneath all of this. Credits are a liability. At one credit to one taka, every verified credit is money the platform owes. Nothing tracks that total and nothing caps it, so the pilot's credit pool can be drained faster than whoever funds it can replenish it, and the first anyone notices is when the funding runs out.

## Solution

Two settlement paths that share one ledger and one arbitration surface.

**Redemption** lets a user convert verified Green Credits to money. A request is guarded before it is accepted — verified balance only, a minimum amount, a monthly per-user cap, and a platform-wide monthly liability cap that hard-blocks. Accepted requests pass through the same Trust Gate from SPEC 12, with redemption-specific signals: amount against the user's own history, account age, redemption frequency. Clean requests auto-approve; unusual ones escalate to the same queue administrators already work. Approval writes a `REDEEM` ledger row and a **Payout** record settled through a mobile financial services sandbox, with the real-world fee disclosed honestly rather than hidden.

**Auction escrow** makes a winning bid binding. When a lot closes with the reserve met, the winner's committed funds are held rather than merely recorded. The seller ships, the buyer inspects against the lot's stated grade, and settlement releases to the seller or returns to the buyer. An inspection failure opens a **Dispute** with photographic evidence from both sides, resolved by an administrator against the lot's stated specification, with a partial-release outcome available because contaminated scrap is usually worth something rather than nothing.

Both paths converge on one arbitration surface. A user disputing a pickup adjustment from SPEC 12, a buyer disputing a lot's grade, and a user contesting a rejected deposit all land in the same queue with the same states and the same evidence handling. Building three dispute systems is how a platform ends up with three inconsistent answers to the same question.

The liability position — total verified credits outstanding, redeemed to date, and the monthly run rate against the cap — is computed from the ledger and visible to administrators, because a credit economy nobody is watching is one that fails silently.

## User Stories

**Requesting redemption**

1. As a user with verified credits, I want to request a cash-out, so that the material I recycled becomes money.
2. As a user, I want only my verified balance offered, so that I am not encouraged to plan around credits still under review.
3. As a user, I want the minimum cash-out amount stated before I try, so that I am not rejected for something I could have known.
4. As a user, I want the real-world transfer fee disclosed with the amount I will actually receive, so that the figure is honest rather than a headline.
5. As a user, I want my monthly remaining cash-out allowance shown, so that the cap is visible rather than a surprise at submission.
6. As a user, I want to choose my mobile wallet provider and enter my number, so that the payout reaches me.
7. As a user, I want my wallet number validated for format before submission, so that a typo does not become a failed transfer.
8. As a user, I want to cancel a request that has not yet been approved, so that a mistake is recoverable.
9. As a user, I want to see every past redemption with its status and reference, so that I can reconcile against what actually arrived.

**Redemption guards**

10. As the system, I want a request below the minimum refused with the minimum stated, so that the rule teaches rather than merely blocks.
11. As the system, I want a request above the verified balance refused, so that the ledger cannot go negative.
12. As the system, I want pending credits excluded from the redeemable balance, so that unverified material is never paid out.
13. As the system, I want a request above the user's monthly cap refused with the remaining allowance stated, so that the limit is legible.
14. As the system, I want a request refused when the platform's monthly liability cap is reached, so that the credit pool cannot be drained.
15. As the system, I want two simultaneous requests that individually fit the balance but jointly exceed it to result in exactly one acceptance, so that concurrency cannot overdraw the ledger.
16. As the system, I want a suspended user unable to redeem, so that suspension has teeth.
17. As the system, I want the requested amount held against the balance while the request is open, so that the same credits cannot back two requests.

**Redemption verification**

18. As the system, I want every redemption evaluated by the Trust Gate, so that cash-out has the same scrutiny as earning.
19. As the system, I want an amount far above the user's historical pattern to escalate, so that a compromised account does not drain in one request.
20. As the system, I want a young account requesting a large cash-out to escalate, so that account-farming does not pay.
21. As the system, I want unusual redemption frequency to escalate, so that structuring many small requests is not a workaround.
22. As an admin, I want escalated redemptions in the same queue as escalated deposits, so that I work one list.
23. As an admin, I want the user's earning history and flag record visible on the redemption item, so that I can judge whether the cash-out matches the contribution.
24. As a user whose redemption escalated, I want to be told it is under review, so that silence is not the message.

**Payout**

25. As the system, I want approval to write a `REDEEM` ledger row and a payout record atomically, so that a payout can never exist without its ledger entry.
26. As the system, I want the payout settled through the mobile financial services sandbox with its reference stored, so that the settlement is a real integration rather than a fabricated string.
27. As the system, I want a failed transfer to reverse the ledger row by compensating entry rather than by deletion, so that the ledger stays append-only.
28. As a user, I want to be notified when my payout is sent with its reference, so that I can match it against what I receive.
29. As an admin, I want to retry a failed payout without creating a second ledger entry, so that a transient failure does not double-pay.
30. As an admin, I want payouts reconcilable against the provider's records, so that a discrepancy is findable.

**Liability**

31. As an admin, I want total verified credits outstanding shown, so that I know what the platform owes.
32. As an admin, I want the month's redemptions against the liability cap shown, so that I can see the run rate before it becomes a problem.
33. As an admin, I want an alert as the monthly cap is approached, so that funding is arranged before cash-out stops.
34. As an admin, I want to adjust caps with the change recorded, so that a funding increase takes effect without a deploy.
35. As an admin, I want a manual ledger adjustment to require a reason and appear in the user's history, so that corrections are visible rather than quiet.

**Auction escrow**

36. As a seller, I want a winning bid to commit the buyer's funds, so that a bid is a commitment rather than an expression of interest.
37. As a winning bidder, I want to see exactly what is held and on what terms, so that the commitment is legible before I make it.
38. As the system, I want a bidder without sufficient committable funds unable to win, so that a bid cannot be uncoverable.
39. As a seller, I want the buyer's held funds visible before I ship, so that I ship against a commitment.
40. As a buyer, I want an inspection window after delivery, so that I can check the lot against its stated grade before funds release.
41. As a buyer, I want to accept a lot and release funds in one action, so that the good path is frictionless.
42. As the system, I want an inspection window that elapses without action to release to the seller, so that a silent buyer does not strand a seller's funds indefinitely.
43. As a buyer, I want to reject a lot with photographic evidence and a stated reason, so that a mis-described lot does not have to be paid for.
44. As a seller, I want a rejection to reach me with the buyer's evidence, so that I can respond rather than merely lose.
45. As the system, I want a rejection to freeze the held funds pending arbitration, so that neither party can act unilaterally.
46. As a winning bidder who abandons the purchase, I want the consequence stated in advance, so that the penalty is a known term rather than a surprise.
47. As a seller, I want an abandoned purchase to release a portion to me and offer the lot to the next bidder, so that my week is not wasted.

**Dispute arbitration**

48. As either party, I want to open a dispute with a reason and evidence, so that disagreement has a process.
49. As either party, I want to add evidence while the dispute is open, so that I can respond to the other side.
50. As an admin, I want a dispute queue with clear states, so that every dispute has an owner and an end.
51. As an admin, I want both parties' evidence, the lot's stated specification, and the transaction history on one screen, so that arbitration is informed.
52. As an admin, I want to resolve in favour of either party or split the held amount, so that partially contaminated material has a proportionate outcome.
53. As an admin, I want my resolution and reasoning recorded immutably, so that a resolution can be reviewed but not rewritten.
54. As both parties, I want to be notified of the resolution with its reasoning, so that the outcome is explained rather than merely imposed.
55. As a party who lost, I want one escalation to a final review, so that a single administrator's judgment is not the only word.
56. As the system, I want a dispute on a pickup to pause that pickup's credit verification, so that credits are not verified while their basis is contested.
57. As an admin, I want a party's dispute history visible, so that a serial disputant is distinguishable from an unlucky one.
58. As the system, I want disputes from pickups, deposits and auctions in one queue with one lifecycle, so that the platform gives one answer to one kind of question.

## Implementation Decisions

- **Redemption is a request, not an action.** It is created in a requested state, guarded, gated, then approved and settled. Modelling cash-out as an immediate operation is what makes a concurrency overdraw possible; making it a record with a state machine makes each transition guardable.
- **Held amounts are ledger rows, not fields.** An open redemption writes a pending `REDEEM` row that the redeemable-balance calculation subtracts. Nothing stores a "held" number anywhere, which keeps the derived-balance invariant intact and means concurrent requests contend on inserted rows rather than on a mutable counter.
- **The overdraw guard is a database-level constraint, not a read-then-write check.** The balance is re-derived and the guard re-evaluated inside the same serialised operation that inserts the row, so two simultaneous requests cannot both read a sufficient balance and both proceed. The loser surfaces as a conflict — which requires SPEC 10's error taxonomy, because under the current persistence seam it would surface as a service outage.
- **Reversal is by compensating entry.** A failed payout writes an offsetting row referencing the original; it never deletes or edits. This is the append-only invariant, and it is also what makes a payout retryable without double-paying — retry targets the payout record, not the ledger.
- **Redemption reuses the Trust Gate unchanged.** It supplies a redemption subject with redemption-specific signals. The gate is not extended, subclassed, or given a redemption mode — it takes a subject and a bundle, and this is a different bundle. Escalated redemptions land in the same queue with the same states.
- **Fee disclosure is a stated figure, not a deduction.** The real-world transfer fee is shown and the net amount stated; the ledger records the gross credit movement. Users see what they will receive, and the ledger stays a record of credits rather than a partial accounting of banking costs.
- **Caps are configuration in the same superseded-record pattern** the Rate Card and the gate's thresholds use, so a past decision is explicable against the caps in force at the time.
- **Liability is derived, never stored.** Outstanding equals verified earned minus redeemed, computed from the ledger. A stored total is a second source of truth that will drift.
- **Escrow holds are ledger-adjacent but separate.** Auction escrow is business-to-business money against a lot, not Green Credits, so it lives in its own hold record with its own state machine rather than being forced into the credit ledger. Conflating them would mean a recycler's copper payment and a student's bottle credits share a table and a set of invariants that fit neither.
- **Bid coverage is checked at bid time, not at close.** A bidder must have committable funds for their bid to stand, so an uncoverable bid never sets the price. This interacts with SPEC 10's bid serialisation: the coverage check happens inside the same serialised operation that assigns the sequence number.
- **Inspection window elapsing releases to the seller.** The default favours the seller because the buyer holds the material and inaction by the party in possession should not strand the other party's payment. The window is configuration.
- **Partial release is a first-class resolution,** not an administrator manually issuing two adjustments. Contaminated scrap usually has value, and a binary outcome forces arbitrators toward whichever error is less embarrassing rather than toward the right answer.
- **One dispute entity for all three sources,** with a subject discriminator. States follow the ratified baseline's dispute machine. Evidence uses SPEC 10's storage boundary, so dispute photographs are handled exactly like deposit evidence.
- **A dispute on a pickup pauses that pickup's credit verification** by refusing the pending-to-verified transition while an open dispute references it. Enforced at the domain boundary, so no handler can route around it.
- **New persistence:** redemption requests, payout records with provider references and attempt history, escrow holds, disputes with their evidence and immutable resolutions, and the cap configuration record with its audit log.
- **External integration:** a mobile financial services sandbox for payout settlement, and a transactional mail provider for dispute correspondence — satisfying the payments and webhook requirements for this slice. Both follow the codebase's established pattern: a real call by default, and a degraded local mode that records a clearly-marked simulated settlement when credentials are absent, so the loop is demonstrable offline. The degraded mode is labelled as simulated in every response and record, never disguised as a real transfer.

### Redemption state machine, and where each guard applies

```
                        ┌─ guards: min amount · verified balance · monthly user cap
                        │          platform liability cap · not suspended
request ────────────────┤
   │                    └─ writes pending REDEEM row (held by derivation)
   ▼
REQUESTED ──gate AUTO_CLEAR──► AUTO_APPROVED ──settle──► PAID
   │                                                       │
   ├──gate ESCALATE──► ESCALATED ──admin──► APPROVED ───────┘
   │                                     └► REJECTED  (compensating entry)
   └──user cancel (only from REQUESTED) ─► CANCELLED  (compensating entry)

settle failure → PAID never reached; compensating entry; payout retryable
```

## Testing Decisions

A good test asserts what a user, a recycler or an administrator can observe: a response, a balance, a ledger, a queue, a resolution. It never asserts internal call order. For the money paths specifically, a good test asserts the **invariant after the operation**, not just the operation's return value — a redemption test that checks the response and not the ledger has verified the wrong thing.

**Seam:** the existing route-handler-over-PGlite seam with the established harness. No new seam. The auction suite is prior art for lot and bid fixtures; the wallet suite is prior art for ledger assertions; the dispatch suite is prior art for driving a multi-step flow through several handlers and for clearing an integration key to force the degraded path.

Behaviours covered:

- **Full loop, one test:** deposit → gate verifies → verified balance → redemption request → auto-approve → payout with reference → ledger shows earn and redeem → derived balance is zero. This is the test that proves the circular economy closes end to end, and it is the one to write first and to demonstrate.
- **Each guard, one test, asserting the specific refusal:** below minimum; above verified balance; pending credits excluded from redeemable; above monthly user cap with remaining allowance in the response; platform liability cap reached; suspended user refused.
- **Concurrency, driven with parallel invocation:** two requests each within the balance but jointly exceeding it — exactly one accepted, one conflict, balance never negative. This is the highest-risk test in the spec, because a read-then-write implementation passes every sequential test and fails this one.
- **Redemption gating:** amount far above history escalates; young account with a large request escalates; high frequency escalates; a routine request auto-approves. Assert the escalated item appears in the same queue as escalated deposits.
- **Payout settlement:** with sandbox credentials present, assert the provider reference is stored; with credentials cleared, assert the degraded path produces a record explicitly labelled simulated and that the response says so. The keys-cleared assertion mirrors the dispatch suite's fallback test.
- **Failed settlement:** assert a compensating entry, that the original row is untouched, that the balance is restored, and that a retry produces one payout and no second ledger movement.
- **Append-only:** after every operation in every test, assert no ledger row was deleted and no verified row's amount changed.
- **Liability:** derived outstanding matches the ledger across a fixture set; cap changes take effect without restart and are recorded with their actor.
- **Escrow happy path:** lot closes with reserve met, winner's funds held, seller ships, buyer accepts, funds release — asserted at each state.
- **Bid coverage:** a bid beyond committable funds does not stand and does not set the price; asserted alongside SPEC 10's concurrent-sequence test so coverage and serialisation are proven together.
- **Inspection window:** elapsing releases to the seller; the release is idempotent under repeated evaluation, matching the lazy close-on-read pattern already used for auctions.
- **Rejection freezes:** neither party can release or withdraw while a dispute is open.
- **Abandonment:** a winner who never funds forfeits per the stated terms and the lot is offered onward.
- **Dispute lifecycle:** open with evidence, both parties add evidence, administrator resolves for buyer, for seller, and with a split — assert the split arithmetic exactly, since a rounding leak here is money.
- **Resolution immutability:** a resolved dispute's resolution cannot be edited.
- **One escalation only:** a second escalation is refused.
- **Cross-cutting pause:** an open dispute on a pickup blocks that pickup's credit from reaching verified, and resolving it unblocks exactly that credit and no other.
- **One queue:** disputes from a pickup, a deposit contest and an auction all appear in one queue with one lifecycle.

## Out of Scope

Real money disbursement — the mobile financial services integration is sandbox only, and the swap to production credentials is a configuration change rather than a code change. Real bank or card rails. Multi-currency. Tax withholding or reporting. Credit expiry. Peer-to-peer credit transfer. Automated dispute adjudication — every dispute reaches a human. Legally binding arbitration. Seller financing, invoicing or credit terms for recyclers. Insurance on lots. Chargeback handling. Refund of platform fees, since no platform fee is charged at pilot.

## Further Notes

Two-simultaneous-requests is the test that matters most in this spec, and it is the one most likely to be skipped, because a read-the-balance-then-insert implementation passes every sequential test written against it. Concurrency bugs in a redemption path are not test-coverage gaps; they are how a credit pool gets drained.

The honest-fee disclosure is worth keeping even though it makes the numbers less attractive. The product's entire argument is that the informal chain underpays because it is opaque about value. A platform that then quietly absorbs a fee into a headline number has reproduced the thing it set out to fix, and at a demonstration the disclosure is a stronger signal than a rounder number would be.

Partial release deserves emphasis as a product decision rather than a feature. Scrap quality is continuous — a lot described as high-purity copper that arrives at eighty percent purity is neither what was sold nor worthless. A binary arbitration outcome forces every arbitrator into a judgment they know is wrong in one direction, and the accumulated effect is that neither side trusts the process. Proportionate outcomes are what make business-to-business trade on the platform repeatable.

The single dispute entity across three sources is a deliberate constraint against the most likely drift in this programme. Each slice will feel like it wants its own dispute flow, each will be slightly different, and the end state is three inconsistent answers to "how do I contest this". One entity with a subject discriminator costs a little expressiveness and buys one process users can learn once.
