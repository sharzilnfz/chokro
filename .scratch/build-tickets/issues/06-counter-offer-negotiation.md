# Ticket 06: Binding Counter-Offer Negotiation Engine

**Spec:** SPEC 18 (Binding Counter-Offer Negotiation Engine [m2 Sameer F4])  
**Owner:** `m2` Ahmad Sameer  
**Status:** `ready-for-agent`  
**Blocked by:** Ticket 01a (Core Spine), Ticket 03 (Media Pipeline), Ticket 05 (Hyperlocal Feed)  
**Blocks:** Ticket 09b (Auction Escrow & Disputes)  

---

## 1. Goal & Context
Replace informal unstructured chat with an enforceable bilateral bargaining state machine:
1. Structured negotiation threads (`negotiation_threads`) between buyer and seller tied to a listing.
2. Enforce the **Single Active Offer Invariant**: at most one `PENDING` offer per thread; issuing a counter-offer marks preceding offers `SUPERSEDED`.
3. 24-hour TTL expiration timer on pending offers.
4. Atomic binding acceptance: accepting an offer moves thread to `COMPLETED`, active offer to `ACCEPTED`, flips listing status `ACTIVE` $\to$ `MATCHED`, marks all competing buyer threads `SUPERSEDED_BY_SALE`, and auto-spawns a `pickup_orders` task.
5. Real-time updates via Pusher Channels with smart HTTP polling fallback.

---

## 2. Vertical Tracer Bullet Scope
- **Schema (`packages/db/src/schema.ts`):**
  - Create `negotiation_threads` (`id`, `listing_id`, `buyer_id`, `seller_id`, `status: 'OPEN' | 'COMPLETED' | 'CLOSED' | 'SUPERSEDED_BY_SALE'`, `last_offer_id`, `created_at`, `updated_at`).
  - Create `negotiation_offers` (`id`, `thread_id`, `offered_by_user_id`, `offer_amount_bdt`, `offered_quantity`, `unit`, `proposed_pickup_at`, `notes`, `status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED' | 'EXPIRED' | 'SUPERSEDED_BY_SALE'`, `expires_at`, `created_at`).
- **Domain (`apps/api/lib/domain/NegotiationDomain.ts`):**
  - Thread lifecycle, offer validation, single active offer guard, atomic acceptance transaction, auto-spawning pickup task.
- **API Routes (`apps/api/app/api/v1/`):**
  - `POST /api/v1/negotiations/threads`
  - `POST /api/v1/negotiations/[id]/offer`
  - `POST /api/v1/negotiations/[id]/accept`
  - `POST /api/v1/negotiations/[id]/reject`
- **UI Components & Screens:**
  - Mobile: `apps/mobile/src/screens/NegotiationThreadScreen.tsx` (`M12`) with `OfferHistoryTimeline`, `ActiveOfferCard`, `CounterOfferInputModal`, `AcceptOfferConfirmDialog`.
- **Verification (`apps/api/tests/spec18-negotiation.test.ts`):**
  - Single active offer constraint, counter-offer supersession, atomic acceptance locking the listing, closing rival buyer threads with `SUPERSEDED_BY_SALE`, and generating a pickup order.
