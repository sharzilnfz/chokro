# Teacher Demonstration & Code Walkthrough Guide: Features 1 & 2
> **Student / Member:** `m3` — Sharzil Nafis (Valuation & Material Intelligence)  
> **Course:** CSE471 — System Analysis & Design  
> **Focus Features:**  
> 1. **Feature 1:** Market-Benchmarked Valuation Engine *(Retrofit)*  
> 2. **Feature 2:** AI Next-Life Scrap Vision Agent  
> *(No other features are included in this guide)*

---

## Quick Reference Summary Table for Teacher Evaluation

| Evaluation Criteria | Feature 1: Market-Benchmarked Valuation Engine | Feature 2: AI Next-Life Scrap Vision Agent |
| :--- | :--- | :--- |
| **What It Does (Simple Words)** | Calculates fair BDT payout for scrap materials in real time by comparing local price tables against live international commodity markets and USD/BDT currency rates. | Scans photos of scrap using AI, detects category and condition, validates safety/e-waste rules, joins with the DB rate card for pricing, and suggests the best circular next life (Recycle, Repair, Resell, etc.). |
| **Frontend Screen** | `apps/mobile/src/screens/RateCardScreen.tsx` | `apps/mobile/src/screens/VisionScanScreen.tsx` |
| **Key Frontend Components** | `apps/mobile/src/components/ratecard/RateCardEstimator.tsx`<br>`apps/mobile/src/components/ratecard/EstimatorCard.tsx`<br>`apps/mobile/src/components/ratecard/CommodityDriftBadge.tsx`<br>`apps/mobile/src/components/ratecard/RateCardBrowser.tsx` | `apps/mobile/src/components/VisionResultCard.tsx`<br>`apps/mobile/src/components/vision/VisionCameraViewfinder.tsx`<br>`apps/mobile/src/components/vision/VisionPhotoReview.tsx`<br>`apps/mobile/src/components/vision/ConfidenceMeter.tsx`<br>`apps/mobile/src/components/vision/EwasteHazardBanner.tsx` |
| **Primary API Endpoint** | `GET /api/v1/rate-card/estimate`<br>`GET /api/v1/rate-card/published` | `POST /api/v1/valuation/classify-and-estimate`<br>`GET /api/v1/valuation/scans` |
| **API Route File** | `apps/api/app/api/rate-card/estimate/route.ts` | `apps/api/app/api/valuation/classify-and-estimate/route.ts` |
| **Core Domain Logic File** | `apps/api/lib/domain/ValuationDomain.ts` | `apps/api/lib/domain/ValuationDomain.ts` |
| **Database Tables** | `rate_card_entries`, `rate_benchmarks` | `valuation_scans`, `rate_card_entries` |
| **External Integration** | Open Exchange Rate API (`open.er-api.com`) + COMEX commodity spot quotes | Google Gemini 2.0 Flash / OpenAI Vision API (with local heuristic fallback) |
| **Key Invariant / Algorithm** | Dynamic Drift Formula: $\text{Drift} = \frac{P_{\text{local}} - P_{\text{benchmark}}}{P_{\text{benchmark}}} \times 100$<br>Badges: `UNDER_MARKET` ($<-10\%$), `OVER_MARKET` ($>+10\%$), `IN_SYNC` ($\pm10\%$) | 1. **E-Waste Regulatory Gate:** Forces `RECYCLE` (blocks reuse/donation due to hazardous DoE rules)<br>2. **Unit Rule:** `piece` for appliances/e-waste, `kg` for bulk recyclables |

---

# Feature 1: Market-Benchmarked Valuation Engine (Retrofit)

## 1. High-Level Explanation (What to Say in 30 Seconds)
> *"Sir, in Bangladesh, people hesitate to recycle because informal scrap buyers (bhangariwallas) give arbitrary, unfair prices. At the same time, if our platform pays fixed rates when global plastic or metal prices drop, the platform loses money.*  
> 
> *To solve this, I built the **Market-Benchmarked Valuation Engine**. It doesn't just show static prices from a database. It continuously pulls live international commodity spot prices and real-time USD/BDT currency exchange rates, benchmarks our local rates against them, calculates the percentage drift ($\pm10\%$), and displays transparent market alignment badges so both users and platform operators know the price is accurate and fair."*

---

## 2. Live Demo Script (Step-by-Step Walkthrough)

### Step 1: Open the Rates Tab on the Mobile App
1. Open the mobile app.
2. Tap the **Rates** icon in the bottom navigation bar.
3. You will see the **"What's it worth?"** estimate screen (`RateCardScreen.tsx`).

### Step 2: Estimate a Scrap Material Value
1. Tap on **"Metal"** and choose condition **"Good"**.
2. Type **`15`** into the weight field ($15\text{ kg}$).
3. **Point out to the teacher:**
   - Notice how the estimated total immediately updates to **৳1,650.00** ($15\text{ kg} \times ৳110.00/\text{kg}$).
   - Notice the green badge: **"Market aligned (±10%)"** or drift indicator.
   - Point to the benchmark line below: it shows the international benchmark rate derived from live USD FX rates.

### Step 3: Switch to Browse Rates Mode
1. Tap the **"Browse rates"** toggle at the top.
2. Expand categories like **Plastics**, **Metal**, and **Paper**.
3. **Point out to the teacher:**
   - Every published rate band (`Excellent`, `Good`, `Fair`, `Poor`) is shown with its active BDT price and live commodity benchmark comparison.

---

## 3. Code Walkthrough (Where to Open Files & What to Point At)

### A. Frontend Code
When your teacher says: *"Show me the frontend code for the rate estimator"*:

1. **Open:** `apps/mobile/src/screens/RateCardScreen.tsx`
   - **Explain:** This is the parent container. It manages the mode state (`'estimate'` vs `'browse'`) and renders either `<RateCardEstimator />` or `<RateCardBrowser />`.
2. **Open:** `apps/mobile/src/components/ratecard/RateCardEstimator.tsx`
   - **Explain:** 
     - It has a **350ms debounce timer** on the weight input (`useEffect`) so the app doesn't spam the server on every keystroke.
     - It calls the `useEstimate` hook (TanStack React Query) with `category`, `condition`, and `debouncedWeight`.
     - It handles dual units: if the user selects `APPLIANCES`, it switches from `kg` to `piece` automatically.
3. **Open:** `apps/mobile/src/components/ratecard/CommodityDriftBadge.tsx`
   - **Explain:** This renders the dynamic pill badge based on `drift_status`:
     - `IN_SYNC` $\rightarrow$ Green badge (`Market aligned (±10%)`).
     - `UNDER_MARKET` $\rightarrow$ Amber badge (`X% under global index`).
     - `OVER_MARKET` $\rightarrow$ Purple badge (`X% above global index`).

---

### B. Backend & API Controller Code
When your teacher says: *"Show me the backend API endpoint"*:

1. **Open:** `apps/api/app/api/rate-card/estimate/route.ts`
   - **Explain:**
     - It receives `GET /api/v1/rate-card/estimate?category=METAL&condition=GOOD&weight=15`.
     - Validates query params using `EstimateQuerySchema` from `@chokro/shared`.
     - Delegates directly to `ValuationDomain.estimateRate(...)`.
     - Returns standard JSON wrapped in `apiData(...)`.

2. **Open:** `apps/api/lib/domain/ValuationDomain.ts`
   - **Point to `estimateRate()` (Line ~229):**
     - Queries `rateCardRepo.findPublished()` to get the current published rate from PostgreSQL.
     - Calculates `totalBdt = unitPrice * quantity`.
     - Queries `benchmarksRepo.findByCategory(category)` to get the latest commodity benchmark.
     - Calls `this.calculateDrift(unitPrice, benchmarkBdt)` to compute deviation percentage.
   - **Point to `calculateDrift()` (Line ~198):**
     - Computes: `((localPrice - benchmarkPrice) / benchmarkPrice) * 100`.
     - Determines if the rate is `IN_SYNC`, `UNDER_MARKET`, or `OVER_MARKET`.
   - **Point to `fetchFxRate()` & `fetchLatestCommodityPrices()` (Lines ~103-170):**
     - Shows external integration with `https://open.er-api.com/v6/latest/USD` to get real-time BDT FX rate.
     - Multiplies USD commodity indices by FX rate to generate local BDT benchmarks with resilient baseline fallback.

---

### C. Database Schema & Models
When your teacher says: *"Show me the database tables for rates and benchmarks"*:

1. **Open:** `packages/db/src/schema.ts`
2. **Point to `rateCardEntries` table (Line ~41):**
   - `category`: e.g. `METAL`, `PLASTICS`, `PAPER`.
   - `condition_band`: `EXCELLENT`, `GOOD`, `FAIR`, `POOR`.
   - `unit`: `kg` or `piece`.
   - `price_bdt`: The active price per unit.
   - `effective_from`: Timestamp versioning for audit integrity.
3. **Point to `rateBenchmarks` table (Line ~73):**
   - `category`: e.g. `METAL`.
   - `commodity_symbol`: e.g. `LME-SCRAP-METAL`.
   - `global_price_usd`: Global spot rate in USD.
   - `fx_rate_usd_bdt`: Live currency conversion factor (e.g. `122.50`).
   - `benchmark_bdt`: Derived local price ($USD \times FX$).
   - `updated_at`: Sync timestamp.

---

## 4. Viva Questions & Answers for Feature 1

**Q: "Why not just store fixed prices in a database table? Why do you need benchmarks and drift calculation?"**
> **Answer:** *"If prices are static, the platform is vulnerable to market fluctuations. If global recycled plastic prices fall by 20%, our platform would be overpaying sellers and losing money on every transaction. The benchmark engine continuously syncs with international commodity and FX feeds, warning us if our rate drifts outside the healthy $\pm10\%$ corridor, while giving sellers confidence that our pricing is fair and market-backed."*

**Q: "What happens if the internet goes down or the external FX API fails?"**
> **Answer:** *"In `ValuationDomain.ts`, the network request has a 2.5-second timeout and is wrapped in a try/catch block. If the API is unreachable, it seamlessly falls back to our calibrated in-memory baseline rates. The app never crashes or returns an error to the user."*

---
---

# Feature 2: AI Next-Life Scrap Vision Agent

## 1. High-Level Explanation (What to Say in 30 Seconds)
> *"Sir, everyday users don't know the exact material, condition, or market value of their household scrap, nor do they know whether an old appliance can be repaired, recycled, or if it is hazardous e-waste.*  
> 
> *I built the **AI Next-Life Scrap Vision Agent**. A user snaps a photo of their scrap. Our multimodal AI analyzes the image, identifies the material category and condition, and checks environmental safety invariants. If it detects electronic waste, our safety gate strictly locks the path to `RECYCLE` to comply with hazardous waste laws. It then joins the detected category with our PostgreSQL rate card to calculate an instant BDT valuation and allows 1-tap listing prefilling."*

---

## 2. Live Demo Script (Step-by-Step Walkthrough)

### Step 1: Open the AI Scan Tab
1. Tap the **AI Scan** icon in the bottom navigation bar.
2. The live camera viewfinder appears (`VisionScanScreen.tsx`).

### Step 2: Capture or Select a Scrap Photo
1. Point camera at an item (or select a photo from gallery / tap sample).
2. Tap the **Shutter button**.
3. You will see the **Photo Review screen** (`VisionPhotoReview.tsx`).
   - Optionally toggle *"I know the quantity"* to enter custom weight or leave it for AI estimation.
4. Tap **"Analyze Photo"**.
5. The scanning laser animation runs for 1-2 seconds (`VisionAnalyzingOverlay.tsx`).

### Step 3: Inspect the AI Appraisal Result
1. The **AI Verdict Card** (`VisionResultCard.tsx`) animates into view:
   - **Category & Condition:** e.g., `METAL` · `Good`.
   - **Confidence Meter:** Animated bar showing AI certainty (e.g. `94%`).
   - **Valuation:** Shows calculated payout in BDT (e.g., $1.5\text{ kg} \times ৳110.00 = \mathbf{৳165.00}$).
   - **Next-Life Recommendation Badge:** Semantic badge (`RECYCLE`, `REPAIR`, `RESELL`, `DONATE`, `REUSE`).
   - **AI Reasoning Quote:** Explains why this circular path was chosen.
2. **If scanning E-Waste / Electronics:**
   - Point out the **Amber Hazard Warning Banner** (`EwasteHazardBanner.tsx`).
   - Show how the path is strictly locked to `RECYCLE` because of toxic heavy metals.

### Step 4: 1-Tap Handoff
1. Tap **"List this scrap"**.
2. Point out that the create listing form is immediately pre-filled with the detected category, condition, unit, weight, and photo—eliminating manual typing.

---

## 3. Code Walkthrough (Where to Open Files & What to Point At)

### A. Frontend Code
When your teacher says: *"Show me the frontend code for the AI scanner"*:

1. **Open:** `apps/mobile/src/screens/VisionScanScreen.tsx`
   - **Explain:** 
     - Manages the 4-step UI state machine: Viewfinder $\rightarrow$ Photo Review $\rightarrow$ Analyzing $\rightarrow$ Result Card.
     - Compresses raw camera photos to $<500\text{ KB}$ using `compressPhoto()` before uploading.
     - Calls `useVisionScan.mutate()` with the base64 image string.
     - Has `buildPrefill()` (Line ~91) which formats the result into a clean `ListingPrefill` object for 1-tap listing creation.
2. **Open:** `apps/mobile/src/components/VisionResultCard.tsx`
   - **Explain:**
     - Uses `react-native-reanimated` (`FadeInUp`) for smooth presentation.
     - Formats currency into bold BDT values (`৳Total = unit_price × quantity`).
     - Conditionally renders `<EwasteHazardBanner />` when `classification.is_ewaste_hazard === true`.
3. **Open:** `apps/mobile/src/components/vision/ConfidenceMeter.tsx` & `PathBadge.tsx`
   - **Explain:** Renders color-coded confidence levels and distinct circular transition badges (`RECYCLE` green, `RESELL` blue, `DONATE` purple, `REPAIR` amber).

---

### B. Backend & API Controller Code
When your teacher says: *"Show me the vision classification API and backend pipeline"*:

1. **Open:** `apps/api/app/api/valuation/classify-and-estimate/route.ts`
   - **Explain:**
     - Receives `POST /api/v1/valuation/classify-and-estimate` with `imageBase64` or `imageUrl`.
     - Extracts the authenticated user ID if logged in.
     - Calls `VisionAgentService.classifyAndEstimate(...)`.
     - Returns `201 Created` with classification, valuation, and recommendation.

2. **Open:** `apps/api/lib/domain/ValuationDomain.ts`
   - **Point to `classifyAndEstimate()` (Line ~310):**
     - **Step 1:** Calls `runVisionInference(input)` to execute Google Gemini 2.0 Flash / OpenAI Vision inference.
     - **Step 2 (Unit Invariant):** Enforces unit rules: `piece` for appliances/e-waste, `kg` for recyclable scrap.
     - **Step 3 (Safety Invariant):** If category is `E_WASTE` or hazard is flagged:
       ```typescript
       if (isEwasteOrHazard) {
         nextLifePath = 'RECYCLE';
         rationale = 'Electronic waste contains regulated heavy metals and requires authorized DoE recycling facilities...';
       }
       ```
     - **Step 4 (DB Rate Join):** Queries `rateCardRepo.findPublished()` in PostgreSQL to find the exact official price for `category + condition`.
     - **Step 5 (Audit Log):** Inserts the scan into the `valuation_scans` table using `valuationScansRepo.createScan(...)`.
   - **Point to `runVisionInference()` (Line ~425):**
     - Builds structured JSON prompt for Gemini / OpenAI Vision with strict schema output.
     - Contains resilient rule-based heuristic fallback if API keys are absent or network is offline.

---

### C. Database Schema & Audit Trail
When your teacher says: *"Show me where AI scans and valuations are stored"*:

1. **Open:** `packages/db/src/schema.ts`
2. **Point to `valuationScans` table (Line ~84):**
   - `id`: Unique scan UUID.
   - `user_id`: Foreign key to `users.id` (optional for guest scans).
   - `detected_category`: Canonical category (`METAL`, `PLASTICS`, `E_WASTE`, etc.).
   - `detected_condition`: `EXCELLENT`, `GOOD`, `FAIR`, `POOR`.
   - `estimated_quantity`: Numeric weight or piece count.
   - `unit`: `kg` or `piece`.
   - `next_life_path`: `RECYCLE`, `RESELL`, `REPAIR`, `DONATE`, `REUSE`.
   - `is_ewaste_hazard`: Boolean safety flag.
   - `confidence`: Decimal score (e.g. `0.94`).
   - `estimated_value_bdt`: Calculated monetary value.
   - `reasoning_rationale`: AI explanation text.
   - `created_at`: Timestamp for user scan history.

---

## 4. Viva Questions & Answers for Feature 2

**Q: "Is this just an OpenAI/Gemini API call, or did you write custom business logic?"**
> **Answer:** *"The LLM only performs raw image classification. The real engineering is our domain pipeline:
> 1. **Unit Invariant Gate:** Translates materials into strict domain units (`piece` vs `kg`).
> 2. **Regulatory Safety Invariant:** Hard-locks e-waste to `RECYCLE`, overriding any user attempts to resell toxic e-waste.
> 3. **Live Database Rate Join:** Dynamically joins the AI's detection with our PostgreSQL rate card table to calculate real financial value in BDT.
> 4. **Audit Trail Persistence:** Automatically logs every appraisal into `valuation_scans` for history tracking and pre-fills the marketplace listing form."*

**Q: "What happens if the Gemini/OpenAI API quota runs out during the demo?"**
> **Answer:** *"In `ValuationDomain.ts`, we implemented a heuristic fallback classifier. If the external AI API fails or is unconfigured, the engine extracts material properties using our deterministic local classifier, joins with the PostgreSQL rate card, enforces all safety rules, and completes the scan without crashing."*

---

# Summary Checklist for Your Demo Tomorrow

- [ ] **Feature 1 Checklist:**
  - [ ] Open Rates Tab $\rightarrow$ Select `Metal` + `Good` + `15 kg`.
  - [ ] Point out the ৳1,650 valuation and the live `Market aligned (±10%)` badge.
  - [ ] Switch to Browse tab and show rate cards by category.
  - [ ] Code files ready to open: `RateCardScreen.tsx`, `RateCardEstimator.tsx`, `rate-card/estimate/route.ts`, `ValuationDomain.ts`.

- [ ] **Feature 2 Checklist:**
  - [ ] Open AI Scan Tab $\rightarrow$ Snap photo of scrap.
  - [ ] Tap "Analyze Photo" $\rightarrow$ Show AI Verdict Card with confidence meter and next-life badge.
  - [ ] Show E-waste hazard banner logic if scanning electronics.
  - [ ] Tap "List this scrap" $\rightarrow$ Show prefilled marketplace form.
  - [ ] Code files ready to open: `VisionScanScreen.tsx`, `VisionResultCard.tsx`, `classify-and-estimate/route.ts`, `ValuationDomain.ts`, `schema.ts`.
