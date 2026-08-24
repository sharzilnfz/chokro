# Ticket 08b: Custody Handover OTP, Admin Escalation Worklist & Flag Gating

**Spec:** SPEC 12 (Trust Gate: Verification Decisions, Custody Handover & Fraud Surface [m1 Sadat F2, F4])  
**Owner:** `m1` Sadat SKD  
**Status:** `ready-for-agent`  
**Blocked by:** Ticket 08a (Trust Gate Core & Thresholds)  
**Blocks:** Ticket 09a (Wallet Redemption), Ticket 09b (Auction Escrow), Ticket 10 (Impact Ledger)  

---

## 1. Goal & Context
Implement physical handover verification and administrative fraud review surfaces:
1. Two-sided 6-digit OTP Custody Handover for pickups (`custody_handovers`), locking the `COLLECTED` transition behind verified challenge codes with 15m expiration.
2. Admin Escalation Worklist (`/admin/trust-gate/page.tsx` A07) showing evidence photos, signals, and adjudication actions.
3. Decision Contests (`decision_contests`) allowing users one-time appeal on rejected deposits.
4. Collector selection in `PickupDomain.ts` skips flagged partners above threshold with named skip reasons.
5. Notification alerts (Telegram Bot, Twilio SMS, Resend Email) via modular notification seam (`apps/api/lib/notify.ts`).

---

## 2. Vertical Tracer Bullet Scope
- **Schema (`packages/db/src/schema.ts`):**
  - Create `custody_handovers` (`id`, `task_id`, `otp_code_hash`, `giver_user_id`, `collector_partner_id`, `status`, `expires_at`, `confirmed_at`, `created_at`).
  - Create `decision_contests` (`id`, `decision_id`, `user_id`, `reason`, `status`, `reviewed_by`, `reviewed_at`, `created_at`).
- **Domain (`apps/api/lib/domain/HandoverDomain.ts`):**
  - OTP challenge code generation & verification, pickup status progression, escalation queue resolution, contest state machine.
- **API Routes (`apps/api/app/api/v1/`):**
  - `GET /api/v1/admin/trust-gate/escalations` (A07)
  - `POST /api/v1/admin/trust-gate/[id]/adjudicate`
  - `POST /api/v1/trust-gate/contest`
  - `POST /api/v1/handovers/verify-otp`
- **UI Components & Screens:**
  - Admin Web: `apps/api/app/admin/trust-gate/page.tsx` (`A07`).
  - Mobile: `apps/mobile/src/components/HandoverOtpModal.tsx` (`M08`) & `apps/mobile/src/screens/PickupScreen.tsx` (`M07`).
- **Verification (`apps/api/tests/spec12-custody-handover.test.ts`):**
  - OTP custody handshake, escalation queue adjudication, one-time contest workflow, and dispatch partner flag skipping.
