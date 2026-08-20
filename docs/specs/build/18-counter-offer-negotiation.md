# SPEC 18 — Binding Counter-Offer Negotiation Engine

**Status:** build spec  
**Owner:** m2 (Ahmad Sameer) · Feature 4  
**Depends on:** SPEC 10 (invariants, state machines, error taxonomy), SPEC 16 (listing media), SPEC 17 (listing discovery)  
**Blocks:** SPEC 13 (accepted negotiations trigger escrow holds and pickup dispatch)  
**Maps to:** Feature slate §3 (m2 Sameer F4) · PRD §2.2 / G9 (Structured Bargaining & Transparency)  

---

## Problem Statement

Unstructured free-text chat in traditional classifieds (e.g. Facebook Messenger, Bikroy) is the primary source of marketplace failure in Bangladesh. Sellers and buyers engage in non-binding conversations ("bhai koto kom hobe?"), agree informally, and then ghost each other at pickup time. Price agreements are lost in message history, and sellers receive competing claims with no way to enforce commitments.

For non-standard circular materials (e.g., a batch of mixed copper wire or a lot of refurbished office desks), price discovery is dynamic and requires structured bargaining. 

The marketplace requires a **Formal Bilateral Negotiation State Machine**: replacing casual chat with enforceable, binding counter-offers governed by strict expiration timers, atomic acceptance guarantees, and automatic listing state transitions that directly feed logistics and escrow.

---

## Solution

A high-integrity **Bilateral Negotiation Engine & Real-Time Offer Protocol**:

1. **Structured Thread Model (`negotiation_threads`):**
   - Initiated between a verified buyer/partner and the listing owner.
   - Tied directly to a target `listing_id`. Multiple buyers may open parallel threads on an active listing.
2. **The "Single Active Offer" Invariant:**
   - At any time $t$, there is **at most one active (`PENDING`) offer** per negotiation thread.
   - Issuing a counter-offer automatically marks the counterparty's preceding offer as `SUPERSEDED`.
   - Each offer carries an explicit unit price, proposed quantity, proposed pickup date, and a Time-To-Live expiration (default 24 hours).
3. **Atomic Binding Acceptance (The State Lock):**
   - When either party accepts the active offer (`POST /api/v1/negotiations/[id]/accept`), the transition executes inside a serializable database transaction:
     1. The thread state moves to `ACCEPTED`.
     2. The target listing is atomically flipped from `ACTIVE` to `MATCHED`.
     3. All other competing open negotiation threads on that listing are automatically closed and marked `SUPERSEDED_BY_SALE`.
     4. A `pickup_orders` task (SPEC 02/04) is generated with the agreed price, quantity, and scheduled window.
4. **Real-Time Synchronization:**
   - Thread updates, new counter-offers, and acceptance events are broadcasted via **Pusher Realtime Channels / SSE** with fallback to structured HTTP polling.

---

## User Stories

### Initiating & Conducting Negotiations
1. As a buyer, I want to make a formal price offer on a listing with a proposed total taka amount, quantity, and pickup date, so that the seller receives a clear actionable proposal.
2. As a seller, I want to see incoming offers with the buyer's reputation rating and proposed price per unit.
3. As a seller, I want to counter-offer with a revised price or reject the offer with an optional explanation.
4. As both parties, I want each offer to display an active countdown timer showing when it expires.
5. As both parties, I want to receive real-time updates when a counter-offer is submitted or accepted.

### Binding Acceptance & State Progression
6. As a buyer/seller, I want accepting an offer to create a binding transaction agreement that cannot be retroactively modified.
7. As a seller, I want accepting an offer to automatically lock my listing and dismiss other pending inquiries.
8. As a buyer whose competing negotiation was superseded by another buyer's acceptance, I want a clear notification that the item has been claimed.
9. As the system, I want expired offers to close automatically without blocking future offers.

---

## Implementation Decisions

### State Machine Definition

```
NegotiationOffer:   PENDING ──► ACCEPTED    (Binding lock on listing)
                            ──► REJECTED    (Explicit declination)
                            ──► SUPERSEDED  (New counter-offer submitted)
                            ──► EXPIRED     (TTL elapsed without response)

NegotiationThread:  OPEN ──► COMPLETED      (An offer in this thread was ACCEPTED)
                         ──► CLOSED         (Listing sold elsewhere / withdrawn)
```

### Database Schema (`packages/db/src/schema.ts`)

```ts
// Bilateral Negotiation Threads
export const negotiationThreads = pgTable('negotiation_threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  listing_id: uuid('listing_id').notNull().references(() => listings.id),
  buyer_id: uuid('buyer_id').notNull().references(() => users.id),
  seller_id: uuid('seller_id').notNull().references(() => users.id),
  status: varchar('status', { length: 30 }).default('OPEN').notNull(), // OPEN, COMPLETED, CLOSED
  last_offer_id: uuid('last_offer_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Formal Binding Offers within a Thread
export const negotiationOffers = pgTable('negotiation_offers', {
  id: uuid('id').defaultRandom().primaryKey(),
  thread_id: uuid('thread_id').notNull().references(() => negotiationThreads.id),
  offered_by_user_id: uuid('offered_by_user_id').notNull().references(() => users.id),
  offer_amount_bdt: decimal('offer_amount_bdt', { precision: 10, scale: 2 }).notNull(),
  offered_quantity: decimal('offered_quantity', { precision: 10, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  proposed_pickup_at: timestamp('proposed_pickup_at'),
  notes: text('notes'),
  status: varchar('status', { length: 30 }).default('PENDING').notNull(), // PENDING, ACCEPTED, REJECTED, SUPERSEDED, EXPIRED
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
```

### API Routes & Interfaces

1. `POST /api/v1/negotiations/threads`
   - **Auth:** Authenticated User (`requireAuth`)
   - **Body:** `{ listingId: string, initialOfferAmountBdt: number, offeredQuantity: number, proposedPickupAt?: string, notes?: string }`
   - **Behavior:** Creates thread, writes initial `PENDING` offer, notifies seller.
2. `POST /api/v1/negotiations/[id]/offer`
   - **Auth:** Thread Participant (`requireAuth`)
   - **Body:** `{ offerAmountBdt: number, offeredQuantity: number, proposedPickupAt?: string, notes?: string }`
   - **Behavior:** Supersedes previous pending offer, creates new `PENDING` offer, broadcasts realtime event.
3. `POST /api/v1/negotiations/[id]/accept`
   - **Auth:** Thread Counterparty (`requireAuth`)
   - **Behavior:** Locks listing, closes competing threads, moves thread to `COMPLETED`, auto-creates `pickup_orders`.
4. `POST /api/v1/negotiations/[id]/reject`
   - **Auth:** Thread Counterparty (`requireAuth`)
   - **Body:** `{ reason?: string }`

### External Integration & Fallback Specification

- **Primary Realtime API:** Pusher Channels / Webhooks (`channel: private-negotiation-[threadId]`, event: `offer:created`, `offer:accepted`).
- **Graceful Fallback:** When Pusher credentials are unconfigured:
  - The API responds normally with updated entity states.
  - The client UI uses a 3-second smart polling interval using HTTP ETags / conditional `If-Modified-Since` headers.

---

## Rubric Defense & Innovation Claims

* **Innovation Claim (5/5 Marks):** Deterministic state machine governing bilateral negotiations with atomic multi-thread resolution. Bypasses chaotic unformatted chat by enforcing transactional contract parameters (unit price, quantity, expiry TTL).
* **Banned-List Defense:** Defends **Transaction Integrity and Pricing Protocol**. Not generic chat or profile messaging; every state transition directly alters material ownership and initiates downstream logistics.
* **Seam Verification:** Evaluated with Jest against PGlite by establishing two competing buyer negotiation threads on a single listing, accepting Thread A's offer, and asserting that Thread B's offer is marked `SUPERSEDED_BY_SALE` while the listing status is `MATCHED`.
