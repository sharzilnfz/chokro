# Ticket 08a: Trust Gate Pure Function, pHash Engine & Dynamic Thresholds

**Spec:** SPEC 12 (Trust Gate: Verification Decisions & Fraud Surface [m1 Sadat F2])  
**Owner:** `m1` Sadat SKD  
**Status:** `ready-for-agent`  
**Blocked by:** Ticket 01a (Core Spine), Ticket 02 (Partner KYC), Ticket 07 (Verified Deposit)  
**Blocks:** Ticket 08b (Custody Handover & Worklist), Ticket 10 (Impact Ledger)  

---

## 1. Goal & Context
Implement the platform's central mathematical verification and anti-fraud decision engine:
1. Pure decision function `evaluate(subject, signals, thresholds) -> Decision`: any failed signal escalates (`ESCALATE`), clean signals auto-clear (`AUTO_CLEAR`), and `E_WASTE` unconditionally escalates.
2. Inverted fallback rule: unavailable signal collectors trigger escalation, never blanket approval.
3. In-process difference perceptual hashing (dHash/pHash) with Hamming distance comparison detecting duplicate and cropped photos.
4. Dynamic threshold configuration record with an immutable audit log (`trust_threshold_configs`), including GET and PUT administration routes.
5. Deterministic audit sampling via decision ID hash.
6. Auto-clearing decisions flips `PENDING` credits to `VERIFIED` and references the decision ID.

---

## 2. Vertical Tracer Bullet Scope
- **Schema (`packages/db/src/schema.ts`):**
  - Create `trust_decisions` (`id`, `subject_type`, `subject_id`, `decision`, `failing_signals`, `evaluated_signals`, `threshold_config_id`, `decided_by`, `decided_at`, `notes`, `created_at`).
  - Create `fraud_flags` (`id`, `entity_type`, `entity_id`, `flag_type`, `reason`, `severity`, `is_cleared`, `cleared_by`, `cleared_at`, `created_at`).
  - Create `trust_threshold_configs` (`id`, `config_json`, `effective_from`, `updated_by`, `created_at`).
  - Create `evidence_hashes` (`id`, `evidence_url`, `phash_hex`, `uploader_id`, `created_at`).
  - Add `trust_decision_id` to `credit_txns`.
- **Domain (`apps/api/lib/domain/TrustGateDomain.ts`):**
  - Pure decision function, perceptual hashing, geofence check, velocity evaluation, audit sampling, threshold management.
- **API Routes (`apps/api/app/api/v1/`):**
  - `POST /api/v1/trust-gate/evaluate`
  - `GET /api/v1/admin/trust-gate/thresholds` (A08)
  - `PUT /api/v1/admin/trust-gate/thresholds` (A08)
- **UI Components & Screens:**
  - Admin Web: `apps/api/app/admin/thresholds/page.tsx` (`A08`).
- **Verification (`apps/api/tests/spec12-trust-gate-core.test.ts`):**
  - Pure gate unit tests over truth table, API tests asserting credit flipping from `PENDING` $\to$ `VERIFIED`, pHash duplicate photo rejection, e-waste human review lock, and threshold modification.
