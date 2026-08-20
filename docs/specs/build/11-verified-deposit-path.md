# SPEC 11 — Verified Deposit Path: Drop Zone Session → Deposit → Pending Green Credit

**Status:** build spec
**Depends on:** SPEC 10 (invariants, vocabulary, evidence storage, zone resolution by location)
**Blocks:** SPEC 12 (the Trust Gate consumes the evidence bundle this spec produces)
**Maps to:** feature slate Group A Option 1 (Smart QR Dynamic Deposit & Weight Scale Gate) · ratified baseline SPEC 04 stories 5–11

---

## Problem Statement

A student walks across campus with a bag of PET bottles and a dead phone charger, finds the Chokro poster on the bin, opens the app and scans the QR code. The app tells them the zone's name, that it is active, and which categories it accepts. Then the flow ends. There is no way to say "I am dropping four kilograms of plastics right now", no way to attach a photo of what went in, and no credit of any kind. The screen states the limitation in its own copy. The student put material into the loop and the platform has no record that anything happened.

From the platform's side the gap is worse. The QR token is cryptographically signed and constant-time validated, which is real security applied to an operation with no consequence — the token proves a zone exists, and proves nothing about who is standing at it or when. Anyone who photographs a poster once can resolve that zone forever, from anywhere. There is no binding between a user, a zone and a moment in time, which means there is no possible basis for later deciding whether a claimed drop-off was genuine.

And the physical reality of a drop zone makes the naive fix wrong. The user knows what they *think* they dropped; nobody knows what actually landed in the bin until the bin is emptied and weighed. A design that credits the user for their declared quantity at scan time is a design that pays people for typing numbers. The ratified baseline is explicit about this: credits compute from verified quantity only, and the declared figure exists as a fraud signal rather than as a basis for payment.

So the deposit path has to do two things that pull against each other. It must feel instant — the student should walk away from the bin knowing their drop was registered and their reward is coming — while being honest that the amount is not yet established. Nothing in the current codebase does either.

## Solution

A single-use, short-lived **Deposit Session** turns the poster QR from a static identifier into a real authorisation. Scanning the poster creates a session that binds one user to one zone for a bounded window, and returns a session handle plus a human-readable session code. The session is the thing that can be consumed exactly once.

Inside that window the user records a **Deposit**: the category, their declared quantity in the unit the category demands, and a capture-time photo. The Deposit closes the session, stores its **Evidence Bundle**, and — this is the arc that closes the loop — mints a `PENDING` `EARN` Green Credit against the user's ledger, priced from the published Rate Card at the declared quantity, and referencing the Deposit as its single custody event.

The user sees the credit immediately, labelled pending, with a plain statement that the amount will be confirmed when the zone is emptied and weighed. Nothing has been paid. Something has been promised, visibly, with a record behind it.

Zone emptying is a Pickup Task against the zone rather than against a Listing. When a collector empties a bin they record the scale reading, and the recorded verified quantity is written back across the deposits in that emptying window. The credit's final amount is set from verified quantity, and the divergence between declared and verified becomes a Trust Signal that SPEC 12 consumes.

Rejection happens at scan time wherever possible, because bad data is cheapest to stop before it enters. A retired zone, a category the zone does not accept, an expired session, a session already consumed, or an `E_WASTE` drop at a zone whose contracted partner holds no licence — all fail before a Deposit exists.

## User Stories

**Session creation**

1. As a user standing at a Drop Zone, I want scanning the poster QR to open a deposit session bound to me and that zone, so that my drop-off is anchored to a place and a moment rather than to a token anyone could copy.
2. As a user, I want the session to show me a short human-readable code, so that zone staff can cross-check my drop against the app if they are present.
3. As a user, I want the session to expire after a short window, so that a photographed poster cannot be replayed later from my sofa.
4. As a user, I want a session to be usable exactly once, so that one scan cannot become five deposits.
5. As a user whose session expired before I finished, I want to scan again and get a fresh session, so that a slow drop-off is an inconvenience rather than a lost deposit.
6. As a user, I want only one open session at a time per zone, so that I cannot stack sessions to farm credits.
7. As the system, I want a session refused at a `PAUSED` or `RETIRED` zone, so that a full or broken bin stops accepting material.
8. As the system, I want the QR token still verified by signature before a session opens, so that a forged poster cannot mint sessions.

**Recording a deposit**

9. As a user, I want to choose the category I am dropping from the zone's accepted list only, so that I cannot record glass at a paper-only bin.
10. As a user, I want the quantity field to demand kilograms for materials and pieces for appliances and e-waste, so that the unit matches what the category is priced by.
11. As a user, I want to attach a photo taken at the moment of drop-off, so that there is evidence if the amount is later disputed.
12. As a user, I want my declared quantity recorded as a declaration rather than as a payment basis, so that the platform's honesty is visible to me.
13. As a user, I want to see the rate the platform will apply and the resulting estimate before I confirm, so that the reward is not a surprise.
14. As a user dropping `E_WASTE`, I want to be told it will always be checked by a person, so that the delay is expected rather than alarming.
15. As the system, I want an `E_WASTE` deposit refused at a zone whose contracted partner holds no e-waste licence, so that hazardous material never enters an illegal chain.
16. As the system, I want a deposit refused when its session is expired, consumed or belongs to another user, so that session integrity is enforced at the point of use.
17. As the system, I want the evidence photo stored and referenced by the deposit record, so that the bundle is retrievable during escalation.

**Pending credit**

18. As a user, I want a Green Credit created the moment my deposit is recorded, so that the loop visibly closes from my side.
19. As a user, I want that credit clearly marked pending with the reason it is pending, so that I do not believe I have been paid.
20. As a user, I want my wallet to show pending and verified balances separately, so that I know what is spendable.
21. As a user, I want the pending credit to reference the deposit that created it, so that I can trace any amount back to a specific drop-off.
22. As the system, I want exactly one credit per deposit, so that a retry cannot double-credit.
23. As the system, I want the credit priced from the Rate Card entry in effect at deposit time and to record which entry it used, so that the amount is reproducible after the rate changes.
24. As a user, I want to be told plainly when no published rate covers my category, so that I am not quoted a number the platform invented.

**Zone emptying and verified quantity**

25. As a zone host, I want to request emptying when the bin is filling, so that a full bin does not silently stop the flow.
26. As an admin, I want emptying dispatched to the zone's contracted partner using the existing dispatch rules, so that logistics reuse one engine rather than two.
27. As a collector, I want to see the deposits recorded at a zone since its last emptying, so that I know what I should be finding in the bin.
28. As a collector, I want to record the scale reading per category when I empty a bin, so that verified quantity enters the system from a physical measurement.
29. As a collector, I want to attach a photo of the scale, so that the reading itself has evidence.
30. As the system, I want verified quantity distributed across that window's deposits in proportion to their declared quantities, so that a shared bin resolves fairly without pretending we can attribute kilograms to individuals.
31. As the system, I want the declared-versus-verified divergence recorded per deposit, so that the Trust Gate can act on inflated declarations.
32. As the system, I want a deposit whose verified quantity is materially below its declaration to remain pending pending review, so that over-declaring is unprofitable.
33. As a user, I want to be notified when my deposit's quantity is confirmed, so that I know the review clock has started.

**Zone capacity**

34. As a zone host, I want cumulative deposits against a zone tracked between emptyings, so that fill level is estimated from real activity rather than guessed.
35. As the system, I want a zone approaching its capacity to raise an emptying request automatically, so that bins do not overflow while everyone waits for someone to notice.
36. As an admin, I want to see per-zone fill estimate, last emptying and pending deposit count, so that I can run the zone network from one screen.
37. As a user, I want a zone near capacity shown as filling in the app, so that I can choose a different bin.

**Finding a zone**

38. As a user, I want to find the nearest Drop Zone to my coordinates, so that I do not have to already know where a bin is.
39. As a user, I want each zone shown with its accepted categories and distance, so that I do not walk to a bin that will not take my material.
40. As a user standing nowhere near a zone, I want to be told so rather than shown an arbitrary zone, so that the feature does not lie to me.

## Implementation Decisions

- **Session, not token, is the authorisation.** The signed QR token remains the zone identifier and is still signature-verified with constant-time comparison. It stops being sufficient on its own: creating a session requires a valid token *and* an authenticated user, and recording a deposit requires a live session owned by that user. The session carries a server-generated single-use secret; the short code shown to the user is derived from it and is display-only, never accepted as the authorisation.
- **Session window is configuration, not a constant in code.** Default fifteen minutes. Expiry is evaluated lazily on read and on use, in the same style as the existing auction close-on-read, so no scheduler is required for correctness.
- **Single-use is enforced by the database.** A partial uniqueness constraint on open sessions per user-and-zone prevents session stacking, and consuming a session is a conditional update that only succeeds from the open state — so two simultaneous deposit attempts against one session cannot both win. This is why SPEC 10's error taxonomy is a prerequisite: the losing attempt must surface as a conflict, not as an outage.
- **Category acceptance and licence gating are checked twice** — at session creation for the zone's list, and again at deposit recording, because the zone may have been paused in between. The `E_WASTE` licence check consults the zone's contracted partner, reusing the existing licence flag rather than introducing a second notion of licensing.
- **Declared quantity is never a payment basis.** The deposit stores declared quantity, and the credit created from it stores the amount computed at declared quantity as an *estimate*. The credit's amount is rewritten exactly once, at verification, from verified quantity. This is the only mutation the ledger permits beyond status, and it is confined to pending rows — a verified credit's amount is immutable.
- **Pricing records its source.** The deposit stores the identifier of the Rate Card entry used, not just the price. This is what makes a past valuation reproducible after the rate is superseded, and it is the mechanism behind the rate card's effective-dating claim. Where no entry applies, the deposit records no price and the flow states so, per SPEC 10 — no constant fallback.
- **One credit per deposit, enforced structurally.** A uniqueness constraint on the credit's custody reference makes double-crediting impossible rather than merely unlikely.
- **Zone emptying is a Pickup Task with a zone source.** The existing Pickup Task gains a source discriminator so a task can originate from a Listing or from a zone; its state machine, its dispatch rules, its capacity and licence gating, and its route optimisation are reused unchanged. Building a parallel emptying workflow would duplicate the dispatch engine, which is the one part of the logistics story that already works well.
- **Proportional distribution of verified quantity** across a window's deposits, weighted by declared quantity. This is an explicit approximation: a communal bin cannot attribute mass to individuals, and pretending otherwise would be dishonest. The approximation is disclosed in the app copy, and the divergence signal is computed against the *window* aggregate rather than per individual, so one over-declarer does not penalise the others.
- **Fill estimate is derived, not stored as truth.** Cumulative declared quantity since last emptying, expressed against the zone's capacity. It is labelled an estimate everywhere it appears, and the automatic emptying request fires from it at a configurable threshold.
- **Nearest-zone search** uses the haversine path introduced in SPEC 10, bounded by a maximum radius, returning an empty result beyond it.
- **New persistence:** deposit sessions, deposits, zone emptying records with per-category scale readings, and zone capacity log entries. The Pickup Task table gains a source discriminator and a nullable zone reference. The credit ledger gains a custody reference and a rate card entry reference. Drop zones gain a capacity figure and a contracted partner reference.
- **External integration:** the session secret and short code are generated and verified through a time-based one-time-code scheme, satisfying the cryptographic-token requirement for this slice. No third-party network call is needed for it, and the existing signed-QR helper is the natural home — extended for time-bounded codes rather than replaced.

### The deposit corridor, as a sequence of guaranteed states

```
scan(zone_token, user)      → DepositSession(OPEN, expires_at, single-use)
record(session, category,
       declared_qty, photo) → Deposit(RECORDED, evidence, rate_entry_id)
                            → CreditTxn(EARN, PENDING, amount=estimate,
                                        custody_ref=deposit.id)   [exactly one]
                            → DepositSession(CONSUMED)
empty(zone, scale_reading)  → verified_qty distributed over window deposits
                            → CreditTxn.amount := f(verified_qty)  [pending only]
                            → divergence signal recorded
                            ── handed to SPEC 12 ──────────────────────────────
```

## Testing Decisions

A good test drives the real handler with a constructed Request and asserts on the response plus the resulting rows. It does not assert that a domain function was called, and it does not inspect session internals — it asserts the *consequences* of session state, because that is what a user or an attacker can observe.

**Seam:** the existing route-handler-over-PGlite seam, using the established harness. Prior art: the dispatch suite is the closest analogue — it drives a multi-step flow through several handlers in sequence and asserts on the persisted outcome, including deliberately clearing an integration key to force the fallback path. The drop zone suite is prior art for zone fixtures.

Behaviours covered:

- **Happy path, end to end through handlers:** resolve a zone, open a session, record a deposit with evidence, assert one `PENDING` `EARN` credit exists referencing the deposit, assert the wallet balance endpoint reports it as pending and not verified, then empty the zone and assert the credit's amount moved to the verified-quantity figure while its status stayed pending. This single test is the proof the loop closed, and it is the first one written.
- **Session integrity:** expired session rejected; already-consumed session rejected; another user's session rejected; second concurrent deposit against one session rejected as a conflict with exactly one credit created — driven with parallel invocation, since sequential awaits cannot expose the race.
- **Session stacking:** two session-creation calls for the same user and zone yield one open session, not two.
- **Zone gating:** paused zone refuses a session; unaccepted category refused at recording; `E_WASTE` at an unlicensed zone refused; a zone paused *between* session creation and deposit still refuses the deposit.
- **Unit discipline:** a kilogram quantity submitted for `APPLIANCES` is rejected; the piece unit is required and recorded.
- **Pricing provenance:** record a deposit, supersede the rate, and assert the deposit still resolves to its original rate card entry and original estimate. With no published rate, assert the deposit succeeds with no price and that no constant price appears in the response.
- **Single-credit guarantee:** a retried deposit request does not produce a second credit.
- **Proportional distribution:** three deposits with declared quantities in a known ratio, one scale reading, assert the distribution and assert the summed verified quantity equals the reading exactly — no rounding leak.
- **Divergence:** a deposit whose window verified materially below declaration stays pending and records the divergence signal.
- **Emptying reuses dispatch:** an emptying task is dispatched by the same nearest-eligible-collector rules, with the integration key cleared so the haversine fallback is what runs — matching the existing dispatch test's approach.
- **Fill and capacity:** cumulative deposits raise the estimate; crossing the threshold creates an emptying request; emptying resets it.
- **Nearest zone:** nearest of three known-coordinate zones returned with distance; a far coordinate returns nothing.
- **Ledger invariant, asserted after every step:** derived balance equals the sum of the ledger, and the verified balance is unaffected by anything in this spec.

## Out of Scope

Flipping a pending credit to verified — that is the Trust Gate in SPEC 12, and this spec deliberately stops at producing the evidence bundle. Redemption and payout (SPEC 13). Impact and carbon accounting (SPEC 14). Real IoT fill sensors — fill is estimated from deposit activity. Attributing bin mass to individuals with better than proportional accuracy. Zone host accounts as a distinct role — a host is a user linked to a zone. Printed poster generation, which already exists. Offline deposit recording with later sync. Per-deposit contamination scoring.

## Further Notes

The single most important line in this spec is that the pending credit is created at deposit time. Everything else is machinery. The reason is behavioural rather than technical: a reward that appears at the moment of the act is what makes the act repeat, and a reward that appears only after a review cycle nobody can see teaches users that dropping material off does nothing. Showing a pending credit with an honest label is the only way to have both immediacy and integrity.

The proportional distribution of bin mass is the weakest joint in the design and should be understood as such. It is defensible at a single campus with a handful of daily depositors, and it degrades as a zone gets busy. The honest framing — and the one worth using in a viva — is that the platform is explicit about which numbers are measured and which are apportioned, which is more than the informal chain it replaces offers.

Note the ordering dependency on SPEC 10: without the error taxonomy, the concurrent-deposit conflict is indistinguishable from a database outage, and without real evidence storage the bundle this spec hands to SPEC 12 contains a placeholder string where the photo should be.
