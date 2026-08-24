# SPEC 12 — Trust Gate: Verification Decisions, Custody Handover & Fraud Surface

**Status:** build spec
**Depends on:** SPEC 10 (pure-function decision, invariants, evidence storage), SPEC 11 (evidence bundles from deposits)
**Blocks:** SPEC 13 (only verified credits are redeemable), SPEC 14 (only verified custody produces impact)
**Maps to:** feature slate Group A Option 2 (Drop-Zone Anomaly & Weight Fraud Detector) · ratified baseline SPEC 04 stories 17–21 and invariants §2.3, §2.4, §2.6

---

## Problem Statement

Deposit-return and reverse-vending systems worldwide are defrauded in the same handful of ways, and every one of them applies here. Photograph a full bin once and submit the picture five times. Declare twelve kilograms of paper and drop two. Have a friend who is a collector confirm your pickups and split the credits. Spoof a location and deposit at a zone you have never visited. Create four accounts and run the same material through all of them. The moment Green Credits convert to money — which SPEC 13 makes true — every one of these becomes worth someone's afternoon.

The reflexive answer is that a person checks everything. That answer kills the platform: at one deposit per user per week, a campus of two thousand users generates two thousand reviews a week, and administrative headcount grows in lockstep with adoption. The ratified baseline names this exact failure and requires the opposite: automatic when the signals are clean, human only when they are not.

Right now neither half exists. There is no verification of any kind. Nothing flips a pending credit to verified, so SPEC 11's deposit corridor terminates in a permanently pending row — the loop is closed on the user's side and still open on the platform's. There is no record of any decision, which makes the baseline's central auditability invariant — every credit traceable to a decision by identifier — unsatisfiable rather than merely unsatisfied. There are no fraud markers, so a user who over-declares twice in a row is treated identically to one who never has.

Pickups have a parallel hole. A Pickup Task reaches `COLLECTED` on the assigned collector's word alone. Nobody confirms that material actually changed hands, which means the platform cannot distinguish a completed collection from a collector tapping a button in a parked van — and it means an imposter who learns a task's identifier can mark someone else's pickup collected. Cashify's documented imposter-agent fraud is this exact shape.

## Solution

One **Trust Gate**: a pure function taking a subject and a bundle of named **Trust Signals** and returning a **Trust Decision** of either `AUTO_CLEAR` or `ESCALATE` with the names of the signals that failed. It reads nothing, calls nothing, and has no clock. Every fraud rule in the product becomes a row in a truth table.

Signal collection is separated from signal evaluation. Collectors gather each signal from the world — an image hash compared against recent hashes, a capture-time location compared against a zone geofence, a declared quantity compared against the verified reading, an activity rate compared against a cap, a counterparty pair compared against its own history — and hand a plain bundle to the gate. This split is why the fraud surface is testable: the rules are exercised as data, and the collectors are exercised individually against the world.

All signals pass and the decision is `AUTO_CLEAR`; the pending credit becomes `VERIFIED` and references the decision. Any signal fails and the decision is `ESCALATE`, carrying the failing signal names into an **Escalation Queue** where an administrator sees the evidence bundle and exactly which checks failed, and decides. `E_WASTE` always escalates regardless of how clean the signals are — a legal invariant, implemented as a rule the gate cannot be configured out of. A configurable share of auto-cleared decisions is re-queued for audit, so the gate is itself checked.

Failed signals also raise **Fraud Flags** on the user or partner, independent of the decision they came from. Flags accumulate, and accumulation is itself a signal — a third over-declaration is treated differently from a first.

Pickups get the missing confirmation: a **Custody Handover** requiring a code the giver holds and the collector must enter, so `COLLECTED` becomes a two-sided event rather than a one-sided claim, and the confirmed handover is what produces the pickup's pending credit and its evidence bundle.

Thresholds — velocity caps, divergence tolerance, geofence radius, audit rate, flag counts — live in an administrator-editable configuration record with an audit log. Tuning the fraud model must never require a deploy, because the thresholds will be wrong at launch and iterating against real pilot data is the only way to make them right.

## User Stories

**The gate itself**

1. As the system, I want every deposit and every confirmed custody handover evaluated against the full signal stack, so that no credit is verified on a user's claim.
2. As the system, I want the gate to be a pure function of subject and signals, so that its rules can be tested exhaustively as a table rather than by constructing the world.
3. As the system, I want a decision to record every signal it saw and every signal that failed, so that a decision is explicable months later.
4. As the system, I want a clean signal stack to auto-clear within the request, so that a correct deposit feels instant.
5. As the system, I want any single failed signal to escalate rather than reduce a score, so that the failure mode is a human review rather than a silent approval.
6. As an admin, I want thresholds editable without a deploy, so that I can tune the model against real behaviour.
7. As an admin, I want every threshold change recorded with who changed it and when, so that a sudden change in auto-clear rate can be traced to its cause.
8. As the system, I want an unavailable signal treated as a failed signal, so that a broken collector degrades to human review rather than to blanket approval.

**Signals**

9. As the system, I want a perceptual hash of each evidence photo compared against recent hashes, so that resubmitting one photo across deposits is caught.
10. As the system, I want a near-duplicate hash to fail the check, so that a crop or a brightness change does not defeat it.
11. As the system, I want capture-time location compared against the zone's geofence, so that a deposit claimed at a zone the user never visited fails.
12. As the system, I want a valid single-use deposit session to satisfy the location requirement on its own, so that a user with location services off is not blocked by a check the QR already answered.
13. As the system, I want the declared category compared against what the vision classifier saw in the evidence photo, so that declaring metal and dropping paper fails.
14. As the system, I want declared quantity compared against verified quantity within a tolerance band, so that inflated declarations fail.
15. As the system, I want per-user daily deposit and credit velocity caps, so that industrial-scale farming through one account fails.
16. As the system, I want per-partner daily confirmation velocity caps, so that a collector confirming implausibly many handovers fails.
17. As the system, I want repeated pairings between one user and one partner treated as a signal, so that collusion between a specific pair surfaces.
18. As the system, I want account age considered, so that a day-old account making a large claim gets human eyes.
19. As the system, I want accumulated fraud flags on the subject treated as a signal, so that a pattern is caught even when the current action looks clean.
20. As the system, I want evidence captured in-app rather than selected from a gallery, so that a photograph found on the internet cannot be submitted as evidence.
21. As the system, I want location metadata stripped from stored evidence after the geofence check, so that the check happens without retaining the user's movements.

**Escalation and human decisions**

22. As an admin, I want a queue of escalated decisions ordered oldest first, so that nothing ages out of sight.
23. As an admin, I want each queue item to show the evidence photo, the declared and verified figures, the failing signal names in plain language, and the subject's flag history, so that a decision takes under a minute.
24. As an admin, I want to verify, reject, or request more information, so that an ambiguous case has a third option other than guessing.
25. As an admin, I want rejection to require a reason, so that the user receives an explanation and the model receives training data.
26. As an admin, I want my decision recorded against my identity, so that human decisions are as auditable as automatic ones.
27. As a user, I want to see that my deposit is under review and roughly how long that takes, so that waiting is not mysterious.
28. As a user whose deposit was rejected, I want the reason, so that I can correct my behaviour or contest the outcome.
29. As a user, I want to contest a rejection once, so that a wrong decision has recourse.
30. As an admin, I want a contested rejection to reopen as a distinct queue item marked as a second look, so that I do not silently re-affirm my own decision.

**Auditing the gate**

31. As an admin, I want a configurable share of auto-cleared decisions re-queued for audit, so that the automatic path is itself checked.
32. As an admin, I want audit sampling to be deterministic under a seeded source of randomness, so that the behaviour is testable.
33. As an admin, I want an audit that finds a bad auto-clear to raise a flag and be counted, so that a drifting threshold is visible.
34. As an admin, I want to see auto-clear rate, escalation rate, and audit failure rate over time, so that I can tell whether the gate is working.

**Custody handover for pickups**

35. As a user waiting for a collector, I want a handover code shown in my app, so that I can confirm the person at my door is the assigned collector.
36. As a collector, I want to enter the giver's handover code to complete a pickup, so that I cannot be impersonated and cannot complete a pickup I did not attend.
37. As the system, I want a pickup unable to reach `COLLECTED` without a confirmed handover, so that one-sided completion is impossible.
38. As a collector, I want to record final condition and verified quantity at handover with the resulting price adjustment, so that an estimate becomes an honest final figure.
39. As a collector, I want to attach evidence at handover, so that the pickup's bundle matches a deposit's.
40. As a user, I want to see the collector's adjustment and accept or dispute it, so that a downward revision is not imposed on me silently.
41. As the system, I want a confirmed handover to mint the pickup's pending credit and submit its bundle to the gate, so that pickups and deposits converge on one verification path.
42. As the system, I want a handover code to be single-use and short-lived, so that a leaked code cannot be replayed.
43. As the system, I want a mismatched code to fail the handover and raise a flag on the collector, so that guessing is expensive.
44. As a user, I want to report a no-show, so that a collector who never arrived is recorded rather than forgotten.

**Fraud flags**

45. As the system, I want a failed signal to raise a flag on the responsible party, so that patterns persist beyond one decision.
46. As an admin, I want to see a user's or partner's flag history, so that a repeat offender is visible at a glance.
47. As an admin, I want to suspend a user or partner whose flags cross a threshold, so that abuse is containable.
48. As a suspended user, I want to be blocked from depositing and redeeming but still able to see my history, so that suspension is containment rather than erasure.
49. As an admin, I want to clear a flag with a reason, so that a false positive does not follow someone forever.
50. As an admin, I want a partner's flags visible when dispatch considers them, so that a flagged collector stops receiving new work.

## Implementation Decisions

- **The gate is a pure function.** Signature is a subject descriptor and a signal bundle in, a decision out. It performs no persistence, no network calls, and takes any time-dependent value as an input rather than reading a clock. Persisting the decision and applying its effect are the caller's job. This is the single most important structural decision in the programme, and it is what makes the fraud surface exhaustively testable.
- **Collectors are separate from evaluation.** Each signal has a named collector that queries the world and returns a value plus an availability marker. An unavailable signal — a hash service down, a vision provider failing — is evaluated as failed, so degradation escalates rather than approves. This inverts the usual fallback posture in the codebase deliberately: every other integration degrades toward continuing, and this one degrades toward stopping, because approving on a broken check is the one failure the trust model cannot absorb.
- **Any-fail escalation, not scoring.** No weighted risk score, no threshold on a composite. A composite score invites tuning a number until the queue is short, which is how these systems quietly stop working. The rule is a conjunction, and the cost of a false escalation is one minute of administrator time.
- **`E_WASTE` escalation is unconditional and not part of the configurable surface.** It is expressed as a rule the configuration record cannot disable, because it is a legal obligation and not a fraud heuristic.
- **Thresholds in a configuration record with an audit log.** One active record, superseded rather than overwritten — the same effective-dating pattern the Rate Card uses, so a past decision can be re-evaluated against the thresholds that were actually in force. Every change records the actor.
- **Perceptual hashing runs in-process.** A difference-hash over a downscaled greyscale image, compared by Hamming distance against hashes from a recent window, scoped per user and globally. No third-party service, because sending every evidence photo to an external hashing API is cost and latency for a computation that is a few dozen lines. Near-duplicate tolerance is a configured distance.
- **Category cross-check reuses the existing vision pipeline** with its existing three-tier fallback. When the pipeline reaches its keyword heuristic tier the signal is marked unavailable rather than passed, per the degradation rule above.
- **Geofence or session, not both.** Physical presence is established by either a capture-time location inside the zone radius or a valid single-use deposit session. Requiring both would block users with location services disabled from a check the session already answers more strongly.
- **Location metadata is used and then discarded.** The geofence check happens on ingest; stored evidence is stripped of location metadata afterwards. Evidence is retained for a bounded period after final decision and then purged.
- **Audit sampling is deterministic.** The sampling decision derives from a hash of the decision identifier against the configured rate, rather than from a random draw. This makes the behaviour reproducible in tests without seeding a global generator, and makes the sample verifiable after the fact.
- **Custody handover code** is generated when a Pickup Task is assigned, shown only to the giver, single-use and short-lived, entered by the collector. Verification is constant-time, matching the existing signed-token comparison discipline. A confirmed handover is the precondition for the `COLLECTED` transition — enforced in the existing Pickup Task transition table so the rule lives with the state machine rather than in a handler.
- **Pickups and deposits converge.** A confirmed handover produces the same shape of evidence bundle as a deposit and submits it to the same gate. There is one verification path, not one per source.
- **The credit's amount is finalised from verified quantity at the moment of verification,** which is the single permitted mutation on a pending ledger row per SPEC 10. A verified row is immutable thereafter.
- **Fraud flags are independent records,** not fields on the subject, so they accumulate with their own reasons, timestamps and clearing history. Flag count feeds back in as a signal, which is the one intentional cycle in the design.
- **Dispatch consults flags.** A partner over the flag threshold is skipped by collector selection with a new named skip reason, extending the existing eligibility audit rather than adding a separate gate.
- **New persistence:** trust decisions with their signal bundle and outcome, fraud flags, the threshold configuration record with its audit log, custody handovers, evidence hash records, and contest records. The credit ledger gains a decision reference, which is what makes the auditability invariant enforceable.
- **External integration:** escalations and rejections notify administrators and users through a webhook-based alerting channel and the existing mail sender, satisfying the alerting requirement for this slice.

### The rule table, as the gate expresses it

```
evaluate(subject, signals) → Decision

  if subject.category == E_WASTE            → ESCALATE ["e_waste_mandatory_review"]
  if any signal.available == false          → ESCALATE [unavailable signal names]
  if any signal.passed  == false            → ESCALATE [failed signal names]
  otherwise                                 → AUTO_CLEAR

signals: in_app_capture · hash_unique · location_or_session · category_match
         quantity_within_band · user_velocity · partner_velocity
         pair_history · account_age · flag_count
```

## Testing Decisions

A good test here asserts what an administrator or an attacker could observe: a decision outcome, a set of failing signal names, a credit status, a queue's contents. It never asserts which internal branch produced the outcome.

This spec is the one place with two seams, and the split is deliberate.

**Seam one — the pure gate, unit-tested directly.** A truth table: each signal failing alone, all passing, several failing together, unavailable signals, and the `E_WASTE` override tested against an otherwise perfect bundle. Driving twenty signal combinations through HTTP would require constructing twenty worlds to assert twenty rows, and the resulting tests would be unreadable and slow. The ratified baseline already identified these as the highest-value tests in the project. Because the function is pure, these tests need no database at all.

**Seam two — everything else, at the existing route-handler-over-PGlite seam,** using the established harness, with the dispatch suite as prior art for multi-handler flows and the valuation suite as prior art for exercising the vision pipeline's fallback tiers by clearing keys.

Behaviours covered at the route seam:

- **Clean deposit auto-clears end to end:** SPEC 11's happy path continued — record a deposit with clean signals and assert the credit reaches `VERIFIED`, references a persisted decision, and that the verified balance moved by exactly the verified-quantity amount.
- **One fixture per fraud shape, each asserting the specific failing signal name:** duplicate photo hash; near-duplicate crop; location outside the geofence with no session; category mismatch against the vision result; quantity above the divergence band; user velocity breach; partner velocity breach; repeated pairing; new account with a large claim; flag count over threshold. Each must escalate, and each must name its own signal — a test that only asserts "escalated" would pass for the wrong reason.
- **`E_WASTE` escalates with an all-green bundle,** and cannot be configured to auto-clear.
- **Unavailable signal escalates:** with the vision provider keys cleared so the pipeline falls to its keyword tier, assert escalation rather than approval. This is the inverted-fallback rule, and it is worth an explicit test because it contradicts the pattern used everywhere else in the codebase.
- **Escalation queue:** ordering is oldest first; the item carries evidence, figures, failing signal names and flag history; verify and reject both terminate the item; reject requires a reason; the decision records the administrator's identity.
- **Contest:** a rejected deposit can be contested once, reopens as a distinct second-look item, and a second contest is refused.
- **Audit sampling** is deterministic — the same decision identifiers under the same configured rate select the same sample across runs, and the sampled proportion matches the rate over a large fixture set.
- **Thresholds are configuration:** change a threshold through the admin surface and assert the same bundle now produces the opposite outcome, with no code change and no restart. Assert the change is recorded with its actor.
- **Custody handover:** a pickup cannot reach `COLLECTED` without a confirmed handover; a wrong code fails and raises a flag on the collector; a code is single-use; an expired code fails; a confirmed handover mints exactly one pending credit and submits its bundle; the collector's quantity adjustment is what the credit resolves to.
- **Flags:** a failed signal raises a flag with its reason; crossing the threshold suspends; a suspended user cannot deposit; a suspended user can still read their history; clearing a flag requires a reason and restores eligibility; a flagged partner is skipped by dispatch with the new skip reason while the existing skip reasons still work.
- **Ledger invariants after every step:** derived balance equals the sum of the ledger; no verified credit exists without a decision reference; no two credits reference one custody event.
- **Concurrency:** two verification attempts on one pending credit — driven in parallel — produce exactly one verified row and one conflict.

## Out of Scope

Machine-learned fraud scoring — the gate is a rule conjunction, and a learned model has no training data until the pilot generates it. Identity document verification. Device fingerprinting. Real-time collusion graph analysis beyond pairwise history. Automated appeals adjudication — a contest reaches a human. Cross-platform fraud data sharing. Redemption-specific signals, which belong to SPEC 13 and reuse this gate rather than extending it here. Threshold auto-tuning. Retaining evidence beyond the bounded retention window.

## Further Notes

The inverted fallback posture is the decision most likely to be argued with in review, and it is correct. Every other integration in this codebase degrades toward continuing to work, which is right for valuation, dispatch and realtime — a user should still get a price when a commodity feed is down. Verification is the opposite: a check that cannot run has not passed, and approving on an unrunnable check is the single failure the trust model cannot absorb. The cost of getting this backwards is that the fraud surface silently opens whenever an external dependency wobbles.

Any-fail escalation over composite scoring is the second decision worth defending explicitly. A weighted score is more sophisticated and worse, because the natural response to a long queue becomes lowering a number, and the system degrades without anyone deciding to degrade it. A conjunction forces the conversation to be about a specific rule.

The auto-clear rate is the health metric that matters. If it sits far below the target the thresholds are too tight and administrators drown; far above and the gate is decorative. It should be visible from the first day of the pilot, because that number is what tells you whether the design works at all.

This spec is also where the loop finally closes. SPEC 11 produced a pending credit; the gate here is what turns it into money the user owns. Until this ships, SPEC 11's corridor terminates in a row nobody can spend.
