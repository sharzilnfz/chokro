# CSE471 Assignment 03: REST APIs Submission

* **Student Name:** Sharzil Nafis
* **Student ID (Last 4 Digits / Port):** `1475`
* **Server Base URL:** `http://localhost:1475`
* **Backend Framework:** Next.js 16 (App Router) + Drizzle ORM + PostgreSQL
* **Features:**
  1. Feature 1: Market-Benchmarked Valuation & Rate Card Engine
  2. Feature 2: AI Next-Life Scrap Vision Agent

---

## Server Start Command

```bash
PORT=1475 pnpm --filter @chokro/api dev
```

---

## Feature 1: Market-Benchmarked Valuation Engine

### API 1: Estimate Item Valuation & Market Drift
* **Endpoint URL:** `http://localhost:1475/api/v1/rate-card/estimate`
* **HTTP Method:** `GET`
* **Headers:**
  * `Accept: application/json`
* **Query Parameters:**
  * `category=PLASTICS`
  * `condition=GOOD`
  * `weight=15.5`
* **Database Connection:** Connects to `rate_card_entries` and `rate_benchmarks` tables.
* **Code Snippet:**
```typescript
export const GET = safeRoute(async (request: Request) => {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const condition = url.searchParams.get('condition');
  const weight = url.searchParams.get('weight');

  const rates = await rateCardRepo.findPublished();
  const match = rates.find((r) => r.category === category && r.condition_band === condition);
  if (!match) return apiError('Rate not found', 404);

  const unitPrice = Number(match.price_bdt);
  const quantity = parseFloat(weight || '1.0');
  const totalBdt = Math.round(unitPrice * quantity * 100) / 100;

  const benchmark = await benchmarksRepo.findByCategory(category!);
  const drift = benchmark ? CommodityBenchmarkService.calculateDrift(unitPrice, Number(benchmark.benchmark_bdt)) : null;

  return apiData({
    estimate: {
      price_bdt: match.price_bdt,
      unit: match.unit,
      category: match.category,
      condition_band: match.condition_band,
      quantity,
      total_bdt: totalBdt,
      market_benchmark: drift ? { benchmark_bdt: Number(benchmark?.benchmark_bdt), ...drift } : null,
    },
  });
});
```
* **Postman Screenshot:**
> *(Paste Screenshot of API 1 from Postman here)*

---

### API 2: Get Published Rate Card with Commodity Drift
* **Endpoint URL:** `http://localhost:1475/api/v1/rate-card/published`
* **HTTP Method:** `GET`
* **Headers:**
  * `Accept: application/json`
* **Database Connection:** Reads active rates from `rate_card_entries` joined with `rate_benchmarks`.
* **Code Snippet:**
```typescript
export const GET = safeRoute(async () => {
  const rates = await rateCardRepo.findPublished();
  const benchmarks = await benchmarksRepo.findAll();
  const benchmarkMap = new Map(benchmarks.map((b) => [b.category, b]));

  const enrichedRates = rates.map((rate) => {
    const bm = benchmarkMap.get(rate.category);
    if (!bm) return rate;
    const benchBdt = Number(bm.benchmark_bdt);
    const drift = CommodityBenchmarkService.calculateDrift(Number(rate.price_bdt), benchBdt);
    return { ...rate, market_benchmark_bdt: benchBdt, drift_pct: drift.drift_pct, drift_badge: drift.badge_text };
  });

  return apiData({ rates: enrichedRates });
});
```
* **Postman Screenshot:**
> *(Paste Screenshot of API 2 from Postman here)*

---

### API 3: Sync Commodity Market Benchmarks
* **Endpoint URL:** `http://localhost:1475/api/v1/rate-card/benchmarks/sync`
* **HTTP Method:** `POST`
* **Headers:**
  * `Content-Type: application/json`
* **Body (JSON):**
```json
{
  "fx_rate": 122.50
}
```
* **Database Connection:** Writes and updates global prices in `rate_benchmarks` table.
* **Code Snippet:**
```typescript
export const POST = safeRoute(async (req: Request) => {
  let fxRate = 122.50;
  try {
    const body = await req.json();
    if (body.fx_rate) fxRate = Number(body.fx_rate);
  } catch {}

  const synced = await CommodityBenchmarkService.syncBenchmarks(fxRate);
  return apiSuccess('Commodity benchmarks synced successfully', { count: synced.length, benchmarks: synced }, 200);
});
```
* **Postman Screenshot:**
> *(Paste Screenshot of API 3 from Postman here)*

---

## Feature 2: AI Next-Life Scrap Vision Agent

### API 4: AI Scrap Classification & Valuation
* **Endpoint URL:** `http://localhost:1475/api/v1/valuation/classify-and-estimate`
* **HTTP Method:** `POST`
* **Headers:**
  * `Content-Type: application/json`
* **Body (JSON):**
```json
{
  "promptNotes": "discarded plastic water bottles and milk jugs in good condition",
  "categoryHint": "PLASTICS",
  "conditionHint": "GOOD",
  "declaredQuantity": 12.5
}
```
* **Database Connection:** Reads price from `rate_card_entries` and inserts audit record into `valuation_scans`.
* **Code Snippet:**
```typescript
export const POST = safeRoute(async (req: Request) => {
  const body = await req.json();
  const result = await VisionAgentService.classifyAndEstimate({
    promptNotes: body.promptNotes,
    categoryHint: body.categoryHint,
    conditionHint: body.conditionHint,
    declaredQuantity: body.declaredQuantity,
  });
  return apiData(result, 201);
});
```
* **Postman Screenshot:**
> *(Paste Screenshot of API 4 from Postman here)*

---

### API 5: AI E-Waste Classification (Recycle Safety Constraint)
* **Endpoint URL:** `http://localhost:1475/api/v1/valuation/classify-and-estimate`
* **HTTP Method:** `POST`
* **Headers:**
  * `Content-Type: application/json`
* **Body (JSON):**
```json
{
  "promptNotes": "damaged smartphone battery and laptop motherboard",
  "categoryHint": "E_WASTE",
  "declaredQuantity": 2
}
```
* **Database Connection:** Persists e-waste flag `is_ewaste_hazard: true` and `next_life_path: RECYCLE` in `valuation_scans`.
* **Code Snippet:**
```typescript
// VisionAgentService.ts (E-waste safety enforcement)
if (category === 'E_WASTE' || rawDetection.isHazard) {
  nextLifePath = 'RECYCLE';
  rationale = 'Electronic waste contains regulated heavy metals and requires authorized DoE recycling facilities.';
}
```
* **Postman Screenshot:**
> *(Paste Screenshot of API 5 from Postman here)*

---

### API 6: List Historical Valuation Scans
* **Endpoint URL:** `http://localhost:1475/api/v1/valuation/scans?limit=10`
* **HTTP Method:** `GET`
* **Headers:**
  * `Accept: application/json`
* **Query Parameters:**
  * `limit=10`
* **Database Connection:** Reads recent scans from `valuation_scans` table.
* **Code Snippet:**
```typescript
export const GET = safeRoute(async (req: Request) => {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const scans = await valuationScansRepo.findRecent(limit);
  return apiData({ scans });
});
```
* **Postman Screenshot:**
> *(Paste Screenshot of API 6 from Postman here)*
