# SPEC 14 — Impact Ledger, ESG Certificates & the Institutional Payer

**Status:** build spec
**Depends on:** SPEC 12 (only verified custody produces impact)
**Blocks:** nothing
**Maps to:** feature slate Group D Option 8 · ratified baseline assumption A8 (institutional payer) and G12 (admin-editable impact factors)

---

## Problem Statement

Chokro has no paying customer. Users are paid rather than charging; the informal chain it competes with charges nothing; and recyclers pay for material, not for software. Every credit issued is a liability against a pool nobody funds. The ratified baseline already identified the answer — an institutional payer — and nothing in the codebase serves one.

This is the gap that decides whether the product has market value or is a well-engineered demonstration. A university sustainability office, a factory subject to environmental reporting, a corporate campus with a stated waste-diversion target: these are entities with budget, an annual obligation to report numbers they currently cannot produce, and no credible source for those numbers. In Bangladesh a manufacturer selling to European buyers is increasingly asked to evidence waste handling in its supply chain, and the honest answer today is a receipt from a scrap dealer with no name on it. That evidentiary vacuum is the thing worth selling into, and Chokro is uniquely positioned to fill it because after SPEC 12 it holds something nobody else does: per-kilogram, photographically evidenced, independently verified disposal records with a named licensed downstream destination.

What exists instead is a leaderboard. Campus leaderboards, streaks and badges are built and working, and they are engagement mechanics — they make individuals return. They do not produce a document an institution can put in a report, they do not aggregate to an auditable total, and they carry no evidence chain. A sustainability officer cannot take a badge to a board meeting.

There is also a compliance dimension being wasted. E-waste handling is legally regulated, the platform already gates e-waste to licensed partners, and it already forces every e-waste action through human review. That is a compliance trail nobody can currently see. An institution that disposes of two hundred laptops has a legal obligation and, on this platform, a complete evidence chain proving it was met — and no way to obtain a document saying so.

## Solution

Turn verified custody into a reportable, defensible number, and sell the report.

Every verified Deposit and every verified Pickup Task writes an **Impact Record**: mass diverted, the Next-Life Path taken, the named downstream destination, and the avoided-emissions estimate derived from an administrator-editable factor table. Records are immutable and reference the custody event and Trust Decision that produced them, so any figure in any report resolves down to a photograph, a scale reading, and a decision made by a named party at a known time. The chain is the product.

Institutions get an **Institution Account** aggregating the impact of their linked members and their own bulk disposals, with a dashboard showing mass diverted by category and path, emissions avoided, e-waste routed to licensed handlers, and the underlying record list. From it they generate a **Sustainability Certificate** — a signed, verifiable document stating the period, the totals, the methodology and its uncertainty, carrying a public verification reference a third party can check without an account.

The methodology is stated rather than implied. Emission factors are a published table with sources and version, certificates state which version produced them, and every figure is labelled an estimate with its basis. Overstating carbon is how this category of product loses credibility permanently, and the defensible position is not a bigger number but a smaller number nobody can dispute.

The compliance trail becomes a first-class report: for a given period and institution, every e-waste item, the licensed partner that received it, its licence reference, and the evidence — the document an institution needs and currently cannot obtain.

This is also the funding mechanism. An institution sponsors a credit pool, its members' verified deposits draw from it, and the institution's spend maps to its diverted mass and its certificate. The liability SPEC 13 tracks acquires a funder.

## User Stories

**Impact records**

1. As the system, I want every verified custody event to write an immutable impact record, so that reportable impact derives from verified material only.
2. As the system, I want an impact record to reference its custody event and Trust Decision, so that any reported figure resolves to its evidence.
3. As the system, I want unverified and rejected events to produce no impact record, so that reports cannot include unproven material.
4. As the system, I want exactly one impact record per custody event, so that totals cannot double-count.
5. As the system, I want an impact record to be immutable once written, so that history cannot be revised to improve a report.
6. As the system, I want a record to state the factor table version used, so that a past figure is reproducible after factors change.
7. As an admin, I want to maintain emission and water factors per category with sources, so that methodology is owned rather than embedded.
8. As an admin, I want factor changes to supersede rather than overwrite, so that previously issued certificates remain reproducible.
9. As the system, I want a category with no published factor to record mass with no emissions figure, so that a missing factor never becomes an invented one.

**Individual impact**

10. As a user, I want my cumulative diverted mass by category, so that my contribution is concrete.
11. As a user, I want my avoided emissions with a plain-language comparison, so that a kilogram figure means something to me.
12. As a user, I want my impact broken down by Next-Life Path, so that I can see reuse and repair distinguished from recycling.
13. As a user, I want to see the named destination for what I dropped off, so that I know where my material actually went.
14. As a user, I want every figure labelled an estimate with its basis available, so that I am not being flattered.
15. As a user, I want a shareable summary of my impact, so that I can show it without exposing my account.
16. As a user, I want my impact to survive changes to my campus affiliation, so that moving institutions does not erase my history.

**Institution accounts**

17. As a sustainability officer, I want an institution account aggregating my linked members' verified impact, so that I have one number for my campus.
18. As a sustainification officer, I want members joined by invite code rather than open enrolment, so that only real members count toward my institution.
19. As a sustainability officer, I want my institution's bulk disposals included alongside member activity, so that the total reflects everything we diverted.
20. As a sustainability officer, I want mass by category and by path with the underlying record list, so that I can answer a challenge to any figure.
21. As a sustainability officer, I want a defined reporting period, so that figures align with my reporting calendar.
22. As a sustainability officer, I want month-on-month trend, so that I can tell whether we are improving.
23. As a sustainability officer, I want to export the record list, so that our own auditors can work with it.
24. As a sustainability officer, I want my dashboard to show only verified material, so that I am never reporting a number that later shrinks.
25. As a sustainability officer, I want to see how many of our members are active, so that I can judge programme engagement rather than just tonnage.

**Certificates**

26. As a sustainability officer, I want to generate a certificate for a period, so that I have a document for our report.
27. As a sustainability officer, I want the certificate to state totals, methodology, factor version and uncertainty, so that it withstands scrutiny.
28. As a sustainability officer, I want it to carry a public verification reference, so that a third party can confirm it without an account.
29. As a third party, I want to verify a certificate by its reference and see the totals and issue date, so that a forged document fails.
30. As a third party, I want verification to expose totals and methodology but no personal data, so that verification does not leak members.
31. As the system, I want a certificate to be immutable once issued, so that a document in circulation cannot be changed behind it.
32. As the system, I want a certificate to record the exact record set it covered, so that it is reproducible even after more records accumulate.
33. As a sustainability officer, I want a certificate reissued as a new version if an underlying record is later reversed, so that a correction is visible rather than silent.
34. As a sustainability officer, I want the certificate as a downloadable document, so that I can attach it to a report.
35. As an admin, I want certificates issued only against verified records, so that the platform's signature means something.

**E-waste compliance**

36. As a sustainability officer, I want a compliance report of every e-waste item we disposed of, so that I can evidence our legal obligation.
37. As a sustainability officer, I want each item to show the licensed partner, its licence reference, and the handover evidence, so that the chain is complete.
38. As a sustainability officer, I want to see that every e-waste item passed human review, so that the platform's own control is evidenced.
39. As an admin, I want e-waste unassignable to an unlicensed partner and that constraint evidenced in the report, so that the control is provable rather than asserted.
40. As a sustainability officer, I want a gap flagged if any e-waste item lacks a complete chain, so that I find the hole before an auditor does.

**Sponsorship**

41. As a sponsor, I want to fund a credit pool for my institution's members, so that recycling is rewarded at my campus.
42. As a sponsor, I want to see my pool's balance and draw rate, so that I can plan replenishment.
43. As a sponsor, I want to cap the monthly draw, so that spend is bounded.
44. As the system, I want a member's verified credit drawn from their institution's pool when one exists, so that sponsorship is the funding mechanism rather than a label.
45. As the system, I want a member to fall back to the platform pool when the institution pool is exhausted, so that a funding gap does not silently stop rewarding users.
46. As a sponsor, I want my spend expressed as cost per kilogram diverted and per tonne of emissions avoided, so that I can justify the budget.
47. As a sponsor, I want an alert as my pool nears exhaustion, so that I can replenish before it stops.
48. As an admin, I want each institution's pool separated in the liability position, so that platform-funded and sponsor-funded liabilities are distinguishable.

**Public credibility**

49. As a prospective institution, I want to see aggregate platform impact, so that I can judge whether joining is worthwhile.
50. As a journalist or researcher, I want the methodology published with its factor sources, so that the platform's claims are checkable.
51. As the platform, I want no personal data in any public aggregate, so that credibility does not cost privacy.

## Implementation Decisions

- **Impact derives from verified custody only,** written as an effect of the Trust Gate's verification rather than at deposit or collection time. This is what makes every reported figure defensible: a number in a certificate traces to a decision, a photograph and a reading.
- **One impact record per custody event, enforced structurally** by a uniqueness constraint on the custody reference — the same pattern SPEC 11 uses for credits, for the same reason. A double-counted tonne in a sustainability report is the kind of error that ends a commercial relationship.
- **Records are immutable and store their inputs.** Mass, path, destination, factor version and the computed figures are all stored rather than recomputed on read. A report that changes when a factor changes is not a report.
- **Factors are an administrator-maintained table with sources, superseded not overwritten** — the same effective-dating pattern as the Rate Card and the gate's thresholds. A missing factor yields mass with no emissions figure, never a default: an invented carbon number is worse than an absent one, and this mirrors SPEC 10's removal of the hardcoded price fallback for exactly the same reason.
- **Uncertainty is stated, not hidden.** Factors carry a range, records carry a point estimate, and certificates state the range. The defensible number is the one nobody can dispute.
- **The reuse and repair paths are reported separately from recycling** rather than folded into one diverted-mass total, because their avoided-emissions profiles differ by an order of magnitude and combining them is the most common way this category of claim becomes indefensible.
- **Institution accounts aggregate over linked members plus the institution's own disposals.** Membership is by invite code, matching the existing campus linkage; an unlinked user's impact counts only toward their own totals and the platform aggregate.
- **A certificate stores the identifiers of the exact record set it covered,** not a query that would return a different set later. Reproducibility of an issued document is the whole point.
- **Certificate verification is a public, unauthenticated lookup by reference,** returning totals, period, methodology version and issue date, and no personal data. The reference is unguessable rather than sequential.
- **A reversed underlying record does not edit a certificate;** it issues a superseding version and marks the prior one as corrected, with both remaining verifiable. Silent correction of a document already in circulation is worse than a visible correction.
- **The compliance report is a distinct report over the same records,** filtered to e-waste, joining the licensed partner and its licence reference and the human review decision. It surfaces incomplete chains explicitly, because an institution needs to find its own gaps before an auditor does.
- **Sponsorship is a funded pool per institution** with a monthly draw cap. Verified credits for a linked member draw from their institution's pool when one has capacity, falling back to the platform pool. The draw is recorded on the credit so the liability position in SPEC 13 separates sponsor-funded from platform-funded — and so an institution's spend maps to its diverted mass.
- **Cost per kilogram and cost per tonne of avoided emissions are derived** from pool draw over impact in the period. These two figures are the ones a budget decision is actually made on.
- **New persistence:** impact records, the factor table with versions and sources, institution accounts, certificates with their covered record sets and verification references, and sponsorship pools with draw history.
- **External integration:** document generation for certificates through a rendering library, and the verification lookup as a public endpoint. Certificate documents are stored through SPEC 10's storage boundary.

### What a certificate must contain to be worth anything

```
Certificate
  institution, period_start, period_end, issued_at, version
  totals: mass_kg by category · mass_kg by path
          emissions_avoided_kgco2e { estimate, range_low, range_high }
          ewaste_items, ewaste_licensed_destinations[]
  methodology: factor_table_version, factor_sources[], basis_statement
  coverage:    record_ids[]            ← the exact set, frozen
  verification: public_reference, signature
  corrections: supersedes_version?, reason?
```

## Testing Decisions

A good test asserts what an institution, an auditor or a third-party verifier can observe: a dashboard total, a certificate's contents, a verification response, a compliance report row. It never asserts how an aggregate was computed. For reporting specifically, a good test asserts **reproducibility** — the same period yields the same figures after unrelated data changes — because a report that drifts is the failure mode that matters.

**Seam:** the existing route-handler-over-PGlite seam with the established harness. No new seam. The leaderboard suite is prior art for aggregate assertions over seeded ledger and activity fixtures; the streak and badge suite is prior art for verification-triggered side effects.

Behaviours covered:

- **Impact follows verification, not custody:** record a deposit and assert no impact record exists; verify it and assert exactly one exists referencing the custody event and the decision; reject a second deposit and assert it produces none.
- **No double-counting:** re-running verification produces no second record; the uniqueness constraint holds under parallel invocation.
- **Immutability and reproducibility:** compute a period total, change the factor table, recompute the same period, and assert the total is unchanged. This is the central test of the spec — a factor change that retroactively alters an issued figure invalidates every certificate.
- **Missing factor:** a category with no published factor yields mass with no emissions figure and no default appears anywhere in the response — the direct analogue of SPEC 10's no-hardcoded-price test.
- **Path separation:** reuse, repair and recycle masses are reported distinctly and their emissions figures use their own factors.
- **Aggregation boundaries:** a linked member's verified impact appears in their institution's total; an unlinked user's does not; a member who changes affiliation keeps their personal history and their prior contributions stay with the prior institution.
- **Only verified material aggregates:** a dashboard total excludes pending and rejected records, asserted by seeding all three states.
- **Certificate coverage is frozen:** issue a certificate, add more verified records in the same period, re-fetch the certificate and assert its totals and covered set are unchanged.
- **Verification is public and private:** the reference resolves without authentication and returns totals and methodology; an unknown reference fails; the response contains no member identifiers or personal data, asserted explicitly rather than by inspection.
- **Correction path:** reverse an underlying record, assert a superseding certificate version is issued, the prior version remains verifiable and marked corrected, and neither document was edited in place.
- **Compliance report:** every e-waste item shows its licensed partner and licence reference and its human review decision; an item with an incomplete chain is flagged rather than omitted; a report over a period with no e-waste returns an empty report rather than an error.
- **Licensing constraint is evidenced:** attempt to assign e-waste custody to an unlicensed partner, assert refusal, and assert the report can evidence that no unlicensed destination appears.
- **Sponsorship draw:** a linked member's verified credit draws from the institution pool; an exhausted pool falls back to the platform pool with the source recorded on the credit; the liability position separates the two; the monthly cap blocks at its limit; the near-exhaustion alert fires at its threshold.
- **Cost derivation:** cost per kilogram and per tonne match the pool draw over impact for the period, asserted on a fixture with known arithmetic.
- **Public aggregate carries no personal data,** asserted explicitly.

## Out of Scope

Certified or third-party-audited carbon accounting — figures are transparent estimates with stated methodology, and pursuing certification is a post-pilot commercial exercise, not a build task. Water and energy factors beyond the initial table. Full life-cycle assessment. Carbon credit issuance, trading or registry integration. Scope 3 supply-chain accounting. Regulatory filing integration with the Department of Environment. Institution billing, invoicing and contract management — sponsorship is a funded pool, not a billing system. Multi-institution corporate hierarchies. Real-time public impact maps. Automated factor updates from external databases.

## Further Notes

This is the spec that answers whether the product has a market, and it is the one most likely to be deferred because it does not change what a user sees. That would be a mistake. SPEC 11 through 13 make the loop work; this one makes it fundable. Without an institutional payer the credit pool has no source, and a circular economy platform that cannot pay its users is a demonstration regardless of how well the loop closes.

The conservative-methodology decision is a commercial one disguised as a technical one. There is a strong pull toward larger impact figures — bigger numbers are better marketing, and every competitor in this category inflates. The pull should be resisted, because the buyer is a sustainability professional who has seen inflated numbers before and whose own credibility depends on not repeating them. A smaller figure with a stated method and a visible evidence chain is worth more to that buyer than a larger figure they cannot defend, and the evidence chain is the one thing Chokro has that a spreadsheet does not.

The e-waste compliance report is probably the strongest near-term commercial wedge in the whole product, and it is almost free. The licence gate exists, the mandatory human review exists, the evidence chain exists after SPEC 12 — the report is a query over records the platform already holds. An institution disposing of laptops has a legal obligation, no credible way to evidence it, and budget. That is a narrower and more urgent need than general sustainability reporting, and it is a better first sale.

One note on sequencing: this spec depends on SPEC 12 and nothing else, so it can be built in parallel with SPEC 13. If the goal is to demonstrate market value rather than mechanical completeness, building this before redemption is the stronger choice — the institutional dashboard and the compliance report are what a buyer reacts to, and neither needs money to have left the system yet.
