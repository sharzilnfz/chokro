# SPEC 02 — Circular Marketplace

**Owner: Member B** · PRD features 7–14 · Depends on: SPEC 00 (states, glossary), SPEC 01 (auth, partners, notifications), SPEC 03 (Next-Life Agent writes into listings), SPEC 04 (pickup verification completes transactions)

---

## Problem Statement

Today a Dhaka resident with an unwanted item has two bad options: haggle with an opaque informal collector, or post on Bikroy/Facebook and endure scams, no-shows, and time-wasting. Neither helps them choose the *most sustainable* outcome — a repairable phone gets scrapped, donatable clothes get landfilled. Users need a marketplace where listing is faster than writing a classified ad, the sustainable path is one tap, prices are transparent, and the transaction is tracked to completion.

## Solution

A listing-based marketplace covering 9 categories with five-path routing (reuse / donate / repair / resell / recycle), a browse/search experience with category, location, and condition filters, a buy-now / collection-request flow for reusable goods, a single-round offer flow for recyclable materials, pickup scheduling with transaction status tracking, and completion with two-sided ratings. Listings can be pre-filled by the Next-Life Agent (SPEC 03), but the marketplace works fully without it — the agent is an accelerator, not a dependency.

## User Stories

**Creating listings**
1. As a user, I want to create a listing with photos, category, condition, weight/quantity, location, and price, so that my item is discoverable.
2. As a user, I want category-specific fields (weight in kg for materials; per-piece for e-waste/appliances), so that I'm not asked to weigh a fridge (A2).
3. As a user, I want the Next-Life Agent's analysis to pre-fill my listing, so that listing takes seconds (integration point with SPEC 03 — must degrade gracefully to manual).
4. As a user, I want to save a listing as draft and publish later, so that I can gather photos first.
5. As a user, I want to edit or cancel my active listing, so that I stay in control.
6. As a user, I want my listing to expire after a TTL (default 30 days), so that stale items don't clog the feed.
7. As a user, I want to choose my item's next-life path (reuse, donate, repair, resell, recycle), so that the right counterparties see it — with the agent's recommendation shown as the default.
8. As a user, I want to see the named downstream destination for my category ("e-waste → DoE-licensed recycler"), so that I trust where my item ends up (A6).

**Categories**
9. As a user, I want to list clothes, books, plastics, paper, metal, glass, furniture, appliances, and e-waste, so that everything unwanted has a path.
10. As the system, I want e-waste listings to be routable only to `e_waste_licensed` partners, so that legal handling is enforced (invariant).

**Browsing & discovery**
11. As a user, I want to browse a feed of active listings newest-first, so that I see fresh items.
12. As a user, I want to search by keyword and filter by category, location/area, condition, and path, so that I find what I need.
13. As a user, I want listing detail with photos, price/rate-card estimate, seller badge, and distance/area, so that I can decide confidently.
14. As a user, I want donated items visibly badged "free — donation", so that generosity is frictionless.

**Buy-now / collection request**
15. As a buyer, I want to buy now at the listed price, so that simple resale completes fast.
16. As a user, I want to request collection for recyclable materials, so that a partner picks up my scrap.
17. As a seller, I want to accept or decline a purchase/collection request, so that I confirm before committing.
18. As the system, I want an accepted request to move the listing to `matched` and create a pickup task (hand-off to SPEC 04), so that logistics start automatically.

**Offers for recyclables**
19. As a partner, I want to make a single binding offer on a recyclable listing, so that pricing is a transparent yes/no — not an auction (G9).
20. As a seller, I want to see offers with partner identity and accept/decline within 48 hours, so that offers don't hang forever (auto-expire).
21. As the system, I want only one active offer round at a time per listing, so that outbidding dynamics never emerge.

**Scheduling & tracking**
22. As both parties, I want to schedule the pickup (date + time window) after matching, so that expectations are aligned.
23. As both parties, I want transaction status tracking (matched → scheduled → collected → verified → completed), so that nobody asks "what's happening?" in person.
24. As both parties, I want notifications at every status change, so that we coordinate without phone calls (uses SPEC 01 notifications).
25. As a user, I want to open a dispute from a transaction, so that problems have a channel (uses SPEC 01 disputes).

**Completion & ratings**
26. As both parties, I want to rate each other (1–5 + optional note) after completion, so that reputation accrues.
27. As a user, I want to see counterparty ratings before accepting, so that I can avoid bad actors.
28. As the system, I want completion of a resell/donate transaction to mark the listing `completed` and record the outcome for impact tracking (hand-off to SPEC 03 impact), so that diversion is measured.

## Implementation Decisions

- **Listing state machine** exactly per SPEC 00 §6; transitions are server-side only (clients request, server decides).
- **Five-path selection:** `path` is a required listing field; agent recommendation pre-selects but never locks. Path determines eligible counterparties (donate → NGOs; repair → repair shops; recycle/resell → collectors/vendors; reuse → open marketplace).
- **Search:** Postgres-backed (ILIKE + indexes on category/area/condition/path); no external search service at MVP.
- **Offers:** `Offer` entity per SPEC 00 (single-round, 48h TTL, binding). Accept → transaction created; decline/expire → listing returns to `active`.
- **Transactions:** a `PickupTask`-linked transaction record owns scheduling + status; statuses mirror the PickupTask state machine; completion requires Trust-Gate-verified pickup for credit-bearing flows, or simple two-sided confirmation for non-credit resell between individuals.
- **Ratings:** one rating per party per completed transaction; displayed as average + count; no rating editing (anti-abuse); ratings below 3 prompt an optional dispute link.
- **Price display:** for recyclable categories, show the current rate-card range next to the seller's ask (transparency wedge vs. kabadiwala haggling).
- **Feed performance:** paginated (cursor), cover-image thumbnails, p95 <1.5s per NFR.

## Testing Decisions

- **Seam: API-level integration tests** over listing/offer/transaction lifecycles; state-machine transition tables as parameterized tests (every legal transition works, every illegal one 409s).
- Test: create→publish→match→schedule→complete happy path for each path type (5 paths × 1 test each); e-waste listing cannot match a non-licensed partner; offer expiry auto-returns listing to active; single active offer round enforced; filters compose correctly; ratings allowed only post-completion, once per party; expired listings leave the feed.
- E2E (Playwright/Detox later): one golden-path listing→completion per sprint demo.

## Out of Scope

- Multi-round auctions, outbidding, escrow, payments between users (cash/bKash settle out-of-band; platform records, doesn't move money), in-app chat (contact via masked phone reveal post-match), delivery/logistics pricing, listing promotion/ads, saved searches.

## Further Notes

- The speed bar: time-to-listed must beat writing a Bikroy ad (~2 min). Agent pre-fill + sensible defaults (area from profile, rate-card price suggestion) exist to hit that bar.
- Masked contact: phone numbers revealed only after `matched` — reduces scam surface vs. open classifieds.
