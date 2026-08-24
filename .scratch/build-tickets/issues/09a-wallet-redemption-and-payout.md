# Ticket 09a: Wallet Settlement, Liability Caps & MFS Payout Engine

**Spec:** SPEC 13 (Wallet Settlement: Redemption & Payout [m4 Imran F3])  
**Owner:** `m4` Imran Ahmed Upom  
**Status:** `ready-for-agent`  
**Blocked by:** Ticket 01a (Core Spine), Ticket 08b (Trust Gate & Handover)  
**Blocks:** Ticket 11 (Demo Engine)  

---

## 1. Goal & Context
Close the circular economy's exit loop through verified credit redemption and mobile financial services cash-out:
1. Green Wallet cash-out state machine: guarded by verified balance, minimum threshold (from config), monthly user cap, and platform liability cap.
2. An open redemption writes a pending `REDEEM` ledger row which is subtracted during derived balance calculations.
3. Concurrent overdraw protection via database serialized locks / CAS queries; failed payouts trigger compensating ledger entries.
4. Mock SSLCommerz MFS payout integration with transparent fee disclosure (from config) and simulated offline mode.
5. Provide user wallet balance/transactions endpoints and admin liability reporting.

---

## 2. Vertical Tracer Bullet Scope
- **Schema (`packages/db/src/schema.ts`):**
  - Create `redemption_requests` (`id`, `user_id`, `amount_credits`, `payout_channel`, `account_number`, `gross_amount_bdt`, `fee_bdt`, `net_amount_bdt`, `status`, `trust_decision_id`, `created_at`).
  - Create `payout_records` (`id`, `redemption_id`, `gateway_ref`, `gateway_provider`, `status`, `payload`, `created_at`).
  - Create `liability_caps` (`id`, `monthly_platform_cap_bdt`, `monthly_user_cap_bdt`, `min_redemption_bdt`, `fee_percentage`, `effective_from`, `updated_by`, `created_at`).
- **Domain (`apps/api/lib/domain/SettlementDomain.ts`):**
  - Redemption guards, atomic overdraw lock, MFS sandbox gateway, compensating entry generator, liability derivation.
- **API Routes (`apps/api/app/api/v1/`):**
  - `POST /api/v1/wallet/redemptions`
  - `POST /api/v1/wallet/redemptions/[id]/cancel`
  - `POST /api/v1/wallet/redemptions/[id]/settle`
  - `GET /api/v1/admin/wallet/redemptions` (A10)
  - `GET /api/v1/admin/wallet/liability` (A11)
  - `GET /api/v1/wallet/balance` (M13)
  - `GET /api/v1/wallet/transactions` (M13)
- **UI Components & Screens:**
  - Mobile: `apps/mobile/src/screens/RedemptionRequestScreen.tsx` (`M14`), `apps/mobile/src/screens/WalletScreen.tsx` (`M13`).
  - Admin Web: `apps/api/app/admin/redemptions/page.tsx` (`A10`), `apps/api/app/admin/liability/page.tsx` (`A11`).
- **Verification (`apps/api/tests/spec13-wallet-redemption.test.ts`):**
  - Full loop test (deposit $\to$ trust gate $\to$ redemption $\to$ payout), concurrent overdraw conflict, compensating ledger entry on failure, and liability reporting.
