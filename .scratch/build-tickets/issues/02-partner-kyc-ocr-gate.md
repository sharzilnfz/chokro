# Ticket 02: Partner KYC Document Intelligence & DoE Licence Gate

**Spec:** SPEC 15 (Partner KYC & Licence Document Intelligence OCR [m1 Sadat F1])  
**Owner:** `m1` Sadat SKD  
**Status:** `ready-for-agent`  
**Blocked by:** Ticket 01a (Core Schema & Seam)  
**Blocks:** Ticket 08a (Trust Gate Decisions)  

---

## 1. Goal & Context
Implement automated Document Intelligence for partner onboarding and statutory Department of Environment (DoE) licensing under Bangladesh E-Waste Management Rules 2021:
1. Ingest Trade License & DoE certificate documents via Google Cloud Vision OCR with local regex parsing fallback.
2. Automatically extract structured entities (License Number, Issue/Expiry Date, Organization Name, TIN).
3. Evaluate discrepancy scores between submitted forms and OCR extractions; auto-reject expired licenses.
4. Admin KYC Adjudication Queue (`/admin/kyc-queue/page.tsx` A06) with side-by-side document viewer and character diff highlights.
5. Grant `e_waste_licensed` platform capability strictly through verified DoE permit extractions with immutable compliance audit logs.

---

## 2. Vertical Tracer Bullet Scope
- **Schema (`packages/db/src/schema.ts`):**
  - Create `kyc_extractions` (`id`, `partner_id`, `document_url`, `document_type`, `ocr_provider`, `raw_extracted_text`, `extracted_org_name`, `extracted_license_number`, `extracted_expiry_date`, `confidence_score`, `match_status`, `mismatched_fields`, `is_expired`, `adjudicated_by`, `adjudicated_at`, `adjudication_notes`, `created_at`).
  - Create `partner_compliance_audits` (`id`, `partner_id`, `extraction_id`, `previous_status`, `new_status`, `granted_capabilities`, `actor_id`, `reason`, `created_at`).
- **Domain (`apps/api/lib/domain/PartnerKycDomain.ts`):**
  - Text parsing, entity regex heuristics, expiration verification, discrepancy matrix calculation, degraded local fallback mode.
- **API Routes (`apps/api/app/api/v1/`):**
  - `POST /api/v1/partners/kyc/extract`
  - `GET /api/v1/admin/partners/kyc/queue` (A06)
  - `POST /api/v1/admin/partners/kyc/[id]/adjudicate`
- **UI Components & Screens:**
  - Admin Web: `apps/api/app/admin/kyc-queue/page.tsx` (`A06`) with `SideBySideDocViewer`, `DiffHighlightBadge`, and `AdjudicateActionToolbar`.
  - Mobile: `apps/mobile/src/screens/PartnerConsoleScreen.tsx` (`M18`) with KYC document uploader.
- **Verification (`apps/api/tests/spec15-partner-kyc.test.ts`):**
  - Document OCR extraction, auto-rejection of expired licenses, discrepancy detection, and admin adjudication granting `e_waste_licensed` flag.
