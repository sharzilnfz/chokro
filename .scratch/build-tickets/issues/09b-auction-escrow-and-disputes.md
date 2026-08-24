# Ticket 09b: Auction Escrow Hold & Unified Dispute Arbitration

**Spec:** SPEC 13 (Wallet Settlement: Auction Escrow & Dispute Arbitration [m1 Sadat F3, m3 Sharzil F4])  
**Owner:** `m1` Sadat SKD & `m3` Sharzil Nafis  
**Status:** `ready-for-agent`  
**Blocked by:** Ticket 01a (Core Spine), Ticket 06 (Counter-Offer Negotiation), Ticket 08b (Trust Gate & Handover)  
**Blocks:** Ticket 11 (Demo Engine)  

---

## 1. Goal & Context
Implement B2B auction escrow security and a unified dispute arbitration workflow:
1. Auction winner escrow hold: holding buyer funds upon lot closure with reserve met, requiring sufficient committable funds at bid time.
2. Inspection window with automated release to seller upon expiration, and partial-release settlement calculations.
3. Unified dispute arbitration queue (`disputes`) spanning pickups, deposits, and auction lots.
4. An open dispute on a pickup automatically pauses that pickup's credit verification.
5. Email notifications for dispute correspondence via Resend Email transport in notification seam.

---

## 2. Vertical Tracer Bullet Scope
- **Schema (`packages/db/src/schema.ts`):**
  - Create `escrow_holds` (`id`, `lot_id`, `buyer_id`, `seller_id`, `amount_bdt`, `status`, `inspection_expires_at`, `created_at`).
  - Create `disputes` (`id`, `source_type`, `source_id`, `opened_by`, `against_user_id`, `reason`, `evidence_urls`, `status`, `resolution`, `resolution_notes`, `resolved_by`, `resolved_at`, `created_at`).
- **Domain (`apps/api/lib/domain/EscrowDomain.ts`, `DisputeDomain.ts`):**
  - Escrow state machine, inspection window evaluation, partial release arithmetic, unified dispute resolution, pickup verification lock.
- **API Routes (`apps/api/app/api/v1/`):**
  - `GET /api/v1/auction-lots/live` (M09)
  - `POST /api/v1/escrow/[id]/release`
  - `POST /api/v1/disputes`
  - `GET /api/v1/admin/disputes` (A09)
  - `POST /api/v1/admin/disputes/[id]/resolve`
- **UI Components & Screens:**
  - Mobile: `apps/mobile/src/screens/DisputeScreen.tsx` (`M15`), `apps/mobile/src/screens/AuctionsScreen.tsx` (`M09`), `apps/mobile/src/screens/LotDetailScreen.tsx` (`M10`).
  - Admin Web: `apps/api/app/admin/disputes/page.tsx` (`A09`).
- **Verification (`apps/api/tests/spec13-escrow-disputes.test.ts`):**
  - Escrow hold/release, dispute lifecycle, partial release calculations, and pickup verification pause during dispute.
