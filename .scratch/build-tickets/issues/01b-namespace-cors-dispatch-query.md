# Ticket 01b: API Namespace Consolidation, CORS Allowlist & Dispatch Query Optimization

**Spec:** SPEC 10 (Loop Closure Manifest & Correctness Debt)  
**Owner:** `m3` Sharzil Nafis  
**Status:** `ready-for-agent`  
**Blocked by:** Ticket 01a (Core Schema, Seam & Storage)  
**Blocks:** Ticket 11 (Demo Engine)  

---

## 1. Goal & Context
Consolidate public API routes, secure cross-origin requests, and optimize candidate dispatch queries:
1. Implement canonical route implementations under `/api/v1/` for all route families (`auth`, `listings`, `feed`, `wallet`, `drop-zones`, `campuses`, `messages`, `badges`, `streaks`, `leaderboard`, `profile`, `admin`).
2. Maintain backward-compatible re-exports in unversioned route paths for existing clients.
3. Configure CORS origin allowlist in `apps/api/lib/http.ts` reading from `CORS_ALLOWED_ORIGINS` with local development fallback.
4. Optimize collector candidate query in `apps/api/lib/domain/PickupDomain.ts` to batch-fetch active tasks in a single aggregate query rather than sequential $N+1$ calls.

---

## 2. Vertical Tracer Bullet Scope
- **HTTP Layer (`apps/api/lib/http.ts`):**
  - Origin allowlist validation against `CORS_ALLOWED_ORIGINS`.
- **API Routes (`apps/api/app/api/v1/`):**
  - Canonical implementations for all core endpoints with standard response shapes.
- **Domain Optimization (`apps/api/lib/domain/PickupDomain.ts`):**
  - Batch-fetch collector active tasks and preserve eligibility audit logs.
- **Verification (`apps/api/tests/spec10-namespace-cors.test.ts`):**
  - Versioned route accessibility, CORS origin gating, and dispatch batch querying.
