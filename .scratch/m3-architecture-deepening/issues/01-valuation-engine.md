# 01 — Deepen F1 & F2 Unified Valuation & Scrap Vision Engine

**What to build:** Consolidate the market valuation and AI scrap vision pipelines into a single deep Valuation module. Encapsulate rate card pricing joins, commodity market drift index calculations, regulated e-waste hazard safety gates, and audit scan persistence behind one narrow interface, isolating external AI and FX feeds behind clean adapter seams.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] Unify rate card pricing lookup, commodity benchmark drift calculation, and e-waste safety gates inside `ValuationDomain`
- [x] Isolate external Vision inference (OpenAI/Gemini) and FX/Commodity feeds behind testable adapter seams
- [x] Update API routes (`/api/v1/valuation/classify-and-estimate`, `/api/v1/rate-card/estimate`, `/api/v1/rate-card/benchmarks`) to call the deep Valuation module
- [x] Verify with automated test suites (`valuation-vision.test.ts`, `ratecard-benchmarks.test.ts`, `ratecard.test.ts`)
