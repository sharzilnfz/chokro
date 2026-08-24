# Ticket 10: Impact Ledger, ESG Certificates & Institutional Sponsorship

**Spec:** SPEC 14 (Impact Ledger, ESG Certificates & the Institutional Payer [m4 Imran F4])  
**Owner:** `m4` Imran Ahmed Upom  
**Status:** `ready-for-agent`  
**Blocked by:** Ticket 01a (Core Spine), Ticket 08b (Trust Gate & Handover)  
**Blocks:** Ticket 11 (Demo Engine)  

---

## 1. Goal & Context
Monetize verified circular loops by serving institutional sustainability reporting and compliance needs:
1. Generate immutable `impact_records` strictly upon Trust Gate verification (diverted mass, Next-Life Path, avoided CO2e based on effective factor version) with `UNIQUE (custody_id)`.
2. Emission factors table with stated uncertainty ranges (`range_low`, `range_high`) and versioning.
3. Separate reporting for reuse/repair vs recycling emission factors.
4. Climatiq API integration with ISO 14044 offline factor table fallback.
5. Campus member aggregation via invite codes; institutional sponsorship pool management with monthly draw caps recorded on credits.
6. Generate SHA-256 signed ESG sustainability certificates with frozen record sets and unguessable public verification tokens (`CERT-CAMPUS-YYYY-8hex`) resolving via `/api/v1/certificates/[ref]`.
7. DoE E-Waste regulatory compliance report evidencing licensed partner custody.

---

## 2. Vertical Tracer Bullet Scope
- **Schema (`packages/db/src/schema.ts`):**
  - Create `impact_records` (`id`, `custody_type`, `custody_id`, `trust_decision_id`, `user_id`, `institution_id`, `category`, `next_life_path`, `mass_kg`, `avoided_co2e_kg`, `factor_version`, `created_at`).
  - Create `emission_factors` (`id`, `category`, `next_life_path`, `factor_co2e_per_kg`, `range_low`, `range_high`, `source`, `version`, `effective_from`, `created_at`).
  - Create `institution_accounts` (`id`, `campus_id`, `invite_code`, `contact_email`, `total_diverted_kg`, `created_at`).
  - Create `sustainability_certificates` (`id`, `institution_id`, `certificate_ref`, `period_start`, `period_end`, `total_mass_kg`, `total_co2e_kg`, `covered_record_ids`, `signature_hash`, `issued_at`).
  - Create `sponsorship_pools` (`id`, `institution_id`, `total_budget_bdt`, `remaining_budget_bdt`, `monthly_draw_cap_bdt`, `created_at`).
- **Domain (`apps/api/lib/domain/ImpactDomain.ts`):**
  - Factor calculation engine, frozen certificate generation, unguessable public reference resolver, DoE compliance reporter, sponsorship pool draw manager.
- **API Routes (`apps/api/app/api/v1/`):**
  - `GET /api/v1/impact/personal` (M16)
  - `GET /api/v1/impact/institutions/[id]`
  - `POST /api/v1/certificates/generate`
  - `GET /api/v1/certificates/[ref]` (M17)
  - `GET /api/v1/admin/impact/certificates` (A12)
  - `GET /api/v1/admin/impact/ewaste-compliance`
- **UI Components & Screens:**
  - Mobile: `apps/mobile/src/screens/ImpactDashboardScreen.tsx` (`M16`), `apps/mobile/src/screens/CertificateViewScreen.tsx` (`M17`).
  - Admin Web: `apps/api/app/admin/certificates/page.tsx` (`A12`).
- **Verification (`apps/api/tests/spec14-impact-ledger.test.ts`):**
  - Impact written strictly on verified decisions, factor version freezing, public certificate verification endpoint, DoE compliance reporting, and sponsorship pool deductions.
