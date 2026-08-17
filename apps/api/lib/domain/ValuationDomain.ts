import { Category, Condition, getCategoryUnit, isPieceCategory, Path } from '@chokro/shared';
import { rateCardRepo } from '../repos/rateCards';
import { benchmarksRepo, RateBenchmark } from '../repos/benchmarks';
import { valuationScansRepo, ValuationScan } from '../repos/valuationScans';

export interface CommodityPriceData {
  category: string;
  commodity_symbol: string;
  global_price_usd: number;
  fx_rate_usd_bdt: number;
  benchmark_bdt: number;
  source: string;
}

export interface RateDriftInfo {
  drift_pct: number;
  drift_status: 'UNDER_MARKET' | 'OVER_MARKET' | 'IN_SYNC';
  badge_text: string;
  explanation: string;
}

export interface ValuationEstimateResult {
  category: Category;
  condition_band: Condition;
  unit: 'kg' | 'piece';
  price_bdt: string;
  unit_price: number;
  quantity: number;
  total_bdt: number;
  market_benchmark?: {
    benchmark_bdt: number;
    global_price_usd: number;
    commodity_symbol: string;
    drift_pct: number;
    drift_status: string;
    badge_text: string;
    explanation: string;
    source: string;
  };
}

export interface VisionClassifyInput {
  userId?: string | null;
  imageUrl?: string | null;
  imageBase64?: string | null;
  promptNotes?: string | null;
  categoryHint?: string | null;
  conditionHint?: string | null;
  declaredQuantity?: number | null;
}

export interface VisionClassifyOutput {
  scan_id: string;
  classification: {
    category: Category;
    condition: Condition;
    unit: 'kg' | 'piece';
    quantity: number;
    confidence: number;
    is_ewaste_hazard: boolean;
  };
  valuation: {
    unit_price_bdt: number;
    total_estimated_bdt: number;
    market_benchmark_bdt?: number;
    drift_pct?: number;
    drift_status?: string;
  };
  recommendation: {
    next_life_path: Path;
    reasoning_rationale: string;
    suggested_action: string;
  };
}

const BASELINE_COMMODITY_PRICES: Record<string, { symbol: string; usdPerUnit: number; source: string }> = {
  METAL: { symbol: 'LME-SCRAP-METAL', usdPerUnit: 0.95, source: 'LME Scrap Metal Composite' },
  PLASTICS: { symbol: 'PET-PLASTIC-IDX', usdPerUnit: 0.38, source: 'Global Polyethylene/PET Index' },
  PAPER: { symbol: 'PULP-PAPER-IDX', usdPerUnit: 0.22, source: 'Global Recovered Paper Index' },
  GLASS: { symbol: 'CULLET-GLASS-IDX', usdPerUnit: 0.15, source: 'Cullet Glass Composite' },
  E_WASTE: { symbol: 'EWASTE-PCB-METALS', usdPerUnit: 2.10, source: 'Precious E-Waste Scrap Index' },
  CLOTHES: { symbol: 'TEXTILE-RECYCLE', usdPerUnit: 0.28, source: 'Global Recycled Textile Feed' },
  BOOKS: { symbol: 'PRINT-PAPER-PULP', usdPerUnit: 0.25, source: 'Recovered Print Pulp Feed' },
  FURNITURE: { symbol: 'WOOD-COMPOSITE', usdPerUnit: 0.80, source: 'Reclaimed Timber & Furniture Index' },
  APPLIANCES: { symbol: 'APPLIANCE-SCRAP', usdPerUnit: 4.50, source: 'Major Appliance Recovery Feed' },
};

const DEFAULT_USD_BDT_FX = 122.50;

/**
 * ValuationDomain — Deep Module for Chokro Valuation & Material Intelligence (M3 F1 + F2)
 *
 * Encapsulates:
 * 1. Rate card database lookups and dual-unit invariant checks
 * 2. Real-time commodity benchmark sync and ±10% drift analytics
 * 3. AI Next-Life scrap vision classification with mandatory e-waste safety gates
 * 4. Audit scan persistence
 */
export const ValuationDomain = {
  /**
   * Fetches real-time USD/BDT rate from external open FX feed with resilient fallback.
   */
  async fetchFxRate(): Promise<number> {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(2500),
      });
      if (response.ok) {
        const json = await response.json();
        if (json && json.rates && typeof json.rates['BDT'] === 'number') {
          return Math.round(json.rates['BDT'] * 100) / 100;
        }
      }
    } catch {
      // Resilient fallback
    }
    return DEFAULT_USD_BDT_FX;
  },

  /**
   * Fetches live market commodity quote (e.g. COMEX Copper / Aluminum) from open feed.
   */
  async fetchLiveCommodityQuote(symbol = 'HG=F'): Promise<number | null> {
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(2500),
      });
      if (response.ok) {
        const json = await response.json();
        const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (typeof price === 'number' && price > 0) {
          return price;
        }
      }
    } catch {
      // Resilient fallback
    }
    return null;
  },

  /**
   * Fetches latest commodity benchmarks with live FX and copper composite adjustment.
   */
  async fetchLatestCommodityPrices(fxRate?: number): Promise<CommodityPriceData[]> {
    const [effectiveFx, liveCopperUsd] = await Promise.all([
      fxRate && fxRate > 0 ? Promise.resolve(fxRate) : this.fetchFxRate(),
      this.fetchLiveCommodityQuote('HG=F'),
    ]);

    const results: CommodityPriceData[] = [];
    const metalUsdPerUnit = liveCopperUsd
      ? Math.round((liveCopperUsd * 2.20462 * 0.075) * 100) / 100
      : BASELINE_COMMODITY_PRICES.METAL.usdPerUnit;

    for (const [category, meta] of Object.entries(BASELINE_COMMODITY_PRICES)) {
      const usdPerUnit = category === 'METAL' ? (metalUsdPerUnit || meta.usdPerUnit) : meta.usdPerUnit;
      const benchmarkBdt = Math.round(usdPerUnit * effectiveFx * 100) / 100;
      results.push({
        category,
        commodity_symbol: meta.symbol,
        global_price_usd: usdPerUnit,
        fx_rate_usd_bdt: effectiveFx,
        benchmark_bdt: benchmarkBdt,
        source: category === 'METAL' && liveCopperUsd ? 'Live Open Commodity & FX Feed' : meta.source,
      });
    }

    return results;
  },

  /**
   * Syncs latest commodity price index into rate_benchmarks table.
   */
  async syncBenchmarks(fxRate?: number): Promise<RateBenchmark[]> {
    const freshData = await this.fetchLatestCommodityPrices(fxRate);
    const synced: RateBenchmark[] = [];

    for (const item of freshData) {
      const record = await benchmarksRepo.upsert({
        category: item.category,
        commodity_symbol: item.commodity_symbol,
        global_price_usd: item.global_price_usd,
        fx_rate_usd_bdt: item.fx_rate_usd_bdt,
        benchmark_bdt: item.benchmark_bdt,
        source: item.source,
      });
      synced.push(record);
    }

    return synced;
  },

  /**
   * Calculates rate drift between local rate card price and global benchmark.
   */
  calculateDrift(localPriceBdt: number, benchmarkBdt: number): RateDriftInfo {
    if (!benchmarkBdt || benchmarkBdt <= 0) {
      return {
        drift_pct: 0,
        drift_status: 'IN_SYNC',
        badge_text: 'Market aligned',
        explanation: 'Local price matches standard valuation.',
      };
    }

    const driftPct = Math.round(((localPriceBdt - benchmarkBdt) / benchmarkBdt) * 1000) / 10;
    let driftStatus: 'UNDER_MARKET' | 'OVER_MARKET' | 'IN_SYNC' = 'IN_SYNC';
    let badgeText = 'Market aligned (±10%)';
    let explanation = 'Local rate aligns closely with international commodity benchmarks.';

    if (driftPct < -10) {
      driftStatus = 'UNDER_MARKET';
      badgeText = `${Math.abs(driftPct)}% under global index`;
      explanation = 'Current platform rate offers strong margin relative to global spot price.';
    } else if (driftPct > 10) {
      driftStatus = 'OVER_MARKET';
      badgeText = `${driftPct}% above global index`;
      explanation = 'Premium rate offered to incentivize high-grade local collection.';
    }

    return { drift_pct: driftPct, drift_status: driftStatus, badge_text: badgeText, explanation };
  },

  /**
   * Estimates item valuation using effective rate card pricing joined with commodity drift.
   */
  async estimateRate(params: {
    category: Category;
    condition: Condition;
    quantity: number;
  }): Promise<ValuationEstimateResult | null> {
    const publishedRates = await rateCardRepo.findPublished();
    const rate = publishedRates.find(
      (r) => r.category === params.category && r.condition_band === params.condition,
    );

    if (!rate) return null;

    const unitPrice = Number(rate.price_bdt);
    const totalBdt = Math.round(unitPrice * params.quantity * 100) / 100;

    let benchmarkData: ValuationEstimateResult['market_benchmark'] | undefined;
    const benchmark = await benchmarksRepo.findByCategory(params.category);
    if (benchmark) {
      const benchmarkBdt = Number(benchmark.benchmark_bdt);
      const drift = this.calculateDrift(unitPrice, benchmarkBdt);
      benchmarkData = {
        benchmark_bdt: benchmarkBdt,
        global_price_usd: Number(benchmark.global_price_usd),
        commodity_symbol: benchmark.commodity_symbol,
        drift_pct: drift.drift_pct,
        drift_status: drift.drift_status,
        badge_text: drift.badge_text,
        explanation: drift.explanation,
        source: benchmark.source,
      };
    }

    return {
      category: params.category,
      condition_band: params.condition,
      unit: rate.unit as 'kg' | 'piece',
      price_bdt: rate.price_bdt,
      unit_price: unitPrice,
      quantity: params.quantity,
      total_bdt: totalBdt,
      market_benchmark: benchmarkData,
    };
  },

  /**
   * Returns published rate card list enriched with current commodity benchmarks.
   */
  async getPublishedRatesWithBenchmarks() {
    const [rates, benchmarks] = await Promise.all([
      rateCardRepo.findPublished(),
      benchmarksRepo.findAll(),
    ]);

    const benchmarkMap = new Map(benchmarks.map((b) => [b.category, b]));

    return rates.map((rate) => {
      const benchmark = benchmarkMap.get(rate.category);
      const localPrice = Number(rate.price_bdt);
      const benchmarkPrice = benchmark ? Number(benchmark.benchmark_bdt) : null;
      const drift = benchmarkPrice ? this.calculateDrift(localPrice, benchmarkPrice) : null;

      return {
        ...rate,
        market_benchmark: benchmark
          ? {
              benchmark_bdt: benchmarkPrice,
              global_price_usd: Number(benchmark.global_price_usd),
              commodity_symbol: benchmark.commodity_symbol,
              drift_pct: drift?.drift_pct,
              drift_status: drift?.drift_status,
              badge_text: drift?.badge_text,
              source: benchmark.source,
            }
          : null,
      };
    });
  },

  /**
   * AI Next-Life Scrap Vision pipeline: Multimodal Inference -> Invariant Enforcement -> Valuation DB Join -> Scan Persistence
   */
  async classifyAndEstimate(input: VisionClassifyInput): Promise<VisionClassifyOutput> {
    const rawDetection = await this.runVisionInference(input);

    const category: Category = rawDetection.category;
    const condition: Condition = rawDetection.condition;
    const unit: 'kg' | 'piece' = getCategoryUnit(category);

    let quantity = input.declaredQuantity && input.declaredQuantity > 0
      ? input.declaredQuantity
      : rawDetection.estimatedQuantity;

    if (unit === 'piece') {
      quantity = Math.max(1, Math.round(quantity));
    } else {
      quantity = Math.round(quantity * 10) / 10;
    }

    // Regulated E-Waste safety gate: force RECYCLE & mark hazardous
    const isEwasteOrHazard = category === 'E_WASTE' || rawDetection.isHazard;
    let nextLifePath: Path = rawDetection.proposedPath;
    let rationale = rawDetection.rationale;
    let suggestedAction = rawDetection.suggestedAction;

    if (isEwasteOrHazard) {
      nextLifePath = 'RECYCLE';
      rationale = 'Electronic waste contains regulated heavy metals and requires authorized DoE recycling facilities. Cannot be casually resold or landfilled.';
      suggestedAction = 'Drop off at nearest certified Chokro e-waste collection bin or schedule authorized hazardous pickup.';
    } else {
      nextLifePath = this.determineNextLifePath(category, condition);
      rationale = this.generateRationale(category, condition, nextLifePath, input.promptNotes);
      suggestedAction = this.generateSuggestedAction(nextLifePath, category);
    }

    // Join with database rate card
    const publishedRates = await rateCardRepo.findPublished();
    const rateMatch = publishedRates.find(
      (r) => r.category === category && r.condition_band === condition,
    );

    const unitPriceBdt = rateMatch ? Number(rateMatch.price_bdt) : this.getDefaultPrice(category, condition);
    const totalEstimatedBdt = Math.round(unitPriceBdt * quantity * 100) / 100;

    // Cross-reference with commodity benchmark
    const benchmark = await benchmarksRepo.findByCategory(category);
    let benchmarkBdt: number | undefined;
    let driftInfo: { drift_pct: number; drift_status: string } | undefined;

    if (benchmark) {
      benchmarkBdt = Number(benchmark.benchmark_bdt);
      const drift = this.calculateDrift(unitPriceBdt, benchmarkBdt);
      driftInfo = {
        drift_pct: drift.drift_pct,
        drift_status: drift.drift_status,
      };
    }

    // Persist scan audit record
    const persistedImageUrl = (input.imageBase64 || input.imageUrl?.startsWith('data:'))
      ? 'data:image/jpeg;base64,...'
      : (input.imageUrl ?? null);

    const scanRecord = await valuationScansRepo.createScan({
      user_id: input.userId || null,
      image_url: persistedImageUrl,
      detected_category: category,
      detected_condition: condition,
      estimated_quantity: quantity,
      unit,
      next_life_path: nextLifePath,
      is_ewaste_hazard: isEwasteOrHazard,
      confidence: rawDetection.confidence,
      estimated_value_bdt: totalEstimatedBdt,
      reasoning_rationale: rationale,
      suggested_action: suggestedAction,
    });

    return {
      scan_id: scanRecord.id,
      classification: {
        category,
        condition,
        unit,
        quantity,
        confidence: Number(scanRecord.confidence),
        is_ewaste_hazard: isEwasteOrHazard,
      },
      valuation: {
        unit_price_bdt: unitPriceBdt,
        total_estimated_bdt: totalEstimatedBdt,
        market_benchmark_bdt: benchmarkBdt,
        drift_pct: driftInfo?.drift_pct,
        drift_status: driftInfo?.drift_status,
      },
      recommendation: {
        next_life_path: nextLifePath,
        reasoning_rationale: rationale,
        suggested_action: suggestedAction,
      },
    };
  },

  async getScans(userId?: string, limit = 20) {
    if (userId) {
      return valuationScansRepo.findByUserId(userId, limit);
    }
    return valuationScansRepo.findRecent(limit);
  },

  async getScanById(id: string) {
    return valuationScansRepo.findById(id);
  },

  /**
   * Multimodal vision inference with external API integration + heuristic fallback.
   */
  async runVisionInference(input: VisionClassifyInput): Promise<{
    category: Category;
    condition: Condition;
    estimatedQuantity: number;
    proposedPath: Path;
    confidence: number;
    isHazard: boolean;
    rationale: string;
    suggestedAction: string;
  }> {
    const promptText = (input.promptNotes || '').toLowerCase();
    const hint = input.categoryHint;

    if (process.env.GEMINI_API_KEY && (input.imageUrl || input.imageBase64)) {
      const imageDataUri = input.imageBase64
        ? (input.imageBase64.startsWith('data:') ? input.imageBase64 : `data:image/jpeg;base64,${input.imageBase64}`)
        : input.imageUrl;
      try {
        let mimeType = 'image/jpeg';
        let base64Data = '';
        if (imageDataUri?.startsWith('data:')) {
          const match = imageDataUri.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            base64Data = match[2];
          }
        } else if (imageDataUri && !imageDataUri.startsWith('http')) {
          base64Data = imageDataUri;
        }

        if (base64Data) {
          const geminiPayload = {
            contents: [
              {
                parts: [
                  {
                    text: `You are Chokro Vision AI. Classify scrap items into: CLOTHES, BOOKS, PLASTICS, PAPER, METAL, GLASS, FURNITURE, APPLIANCES, E_WASTE. Condition: EXCELLENT, GOOD, FAIR, POOR. Output JSON only with keys: category, condition, quantity, path, confidence, is_hazard, rationale, suggested_action. User notes: ${input.promptNotes || 'none'}`,
                  },
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          };

          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(geminiPayload),
              signal: AbortSignal.timeout(8000),
            },
          );

          if (res.ok) {
            const data = await res.json();
            const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textContent) {
              let parsed = JSON.parse(textContent);
              if (Array.isArray(parsed)) parsed = parsed[0];
              if (parsed?.category && parsed?.condition) {
                return {
                  category: parsed.category,
                  condition: parsed.condition,
                  estimatedQuantity: parsed.quantity ? Number(parsed.quantity) : (isPieceCategory(parsed.category) ? 1 : 2.5),
                  proposedPath: parsed.path || 'RECYCLE',
                  confidence: parsed.confidence ? Number(parsed.confidence) : 0.94,
                  isHazard: parsed.category === 'E_WASTE' || Boolean(parsed.is_hazard),
                  rationale: parsed.rationale || 'Google Gemini AI vision detected item properties.',
                  suggestedAction: parsed.suggested_action || 'Proceed with Chokro listing.',
                };
              }
            }
          }
        }
      } catch {
        // Fallback to OpenAI or local heuristic classifier
      }
    }

    if (process.env.OPENAI_API_KEY && (input.imageUrl || input.imageBase64)) {
      const imageDataUri = input.imageBase64
        ? (input.imageBase64.startsWith('data:') ? input.imageBase64 : `data:image/jpeg;base64,${input.imageBase64}`)
        : input.imageUrl;
      try {
        const payload = {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are Chokro Vision AI. Classify scrap items into: CLOTHES, BOOKS, PLASTICS, PAPER, METAL, GLASS, FURNITURE, APPLIANCES, E_WASTE. Condition: EXCELLENT, GOOD, FAIR, POOR. Output JSON only.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Classify this recyclable item. User notes: ${input.promptNotes || 'none'}` },
                { type: 'image_url', image_url: { url: imageDataUri } },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        };
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse(data.choices[0].message.content);
          if (parsed.category && parsed.condition) {
            return {
              category: parsed.category,
              condition: parsed.condition,
              estimatedQuantity: parsed.quantity || (isPieceCategory(parsed.category) ? 1 : 2.5),
              proposedPath: parsed.path || 'RECYCLE',
              confidence: parsed.confidence || 0.94,
              isHazard: parsed.category === 'E_WASTE' || Boolean(parsed.is_hazard),
              rationale: parsed.rationale || 'AI image recognition detected item properties.',
              suggestedAction: parsed.suggested_action || 'Proceed with Chokro listing.',
            };
          }
        }
      } catch {
        // Fallback to local heuristic classifier
      }
    }

    let category: Category = 'PLASTICS';
    let condition: Condition = 'GOOD';
    let isHazard = false;
    let confidence = 0.92;

    if (hint) {
      category = hint as Category;
    } else if (promptText.includes('phone') || promptText.includes('laptop') || promptText.includes('battery') || promptText.includes('circuit') || promptText.includes('electronics')) {
      category = 'E_WASTE';
      isHazard = true;
      confidence = 0.97;
    } else if (promptText.includes('fridge') || promptText.includes('microwave') || promptText.includes('blender') || promptText.includes('fan') || promptText.includes('ac')) {
      category = 'APPLIANCES';
      confidence = 0.95;
    } else if (promptText.includes('copper') || promptText.includes('iron') || promptText.includes('aluminum') || promptText.includes('metal') || promptText.includes('steel') || promptText.includes('tin')) {
      category = 'METAL';
      confidence = 0.93;
    } else if (promptText.includes('cardboard') || promptText.includes('newspaper') || promptText.includes('paper') || promptText.includes('carton')) {
      category = 'PAPER';
      confidence = 0.91;
    } else if (promptText.includes('shirt') || promptText.includes('jeans') || promptText.includes('clothes') || promptText.includes('fabric')) {
      category = 'CLOTHES';
      confidence = 0.90;
    } else if (promptText.includes('book') || promptText.includes('novel') || promptText.includes('textbook')) {
      category = 'BOOKS';
      confidence = 0.92;
    } else if (promptText.includes('bottle') || promptText.includes('container') || promptText.includes('plastic') || promptText.includes('pet')) {
      category = 'PLASTICS';
      confidence = 0.94;
    } else if (promptText.includes('glass') || promptText.includes('jar')) {
      category = 'GLASS';
      confidence = 0.91;
    } else if (promptText.includes('chair') || promptText.includes('table') || promptText.includes('sofa') || promptText.includes('furniture')) {
      category = 'FURNITURE';
      confidence = 0.89;
    }

    if (input.conditionHint) {
      condition = input.conditionHint as Condition;
    } else if (promptText.includes('broken') || promptText.includes('damaged') || promptText.includes('junk') || promptText.includes('poor')) {
      condition = 'POOR';
    } else if (promptText.includes('scratch') || promptText.includes('used') || promptText.includes('fair')) {
      condition = 'FAIR';
    } else if (promptText.includes('brand new') || promptText.includes('mint') || promptText.includes('excellent')) {
      condition = 'EXCELLENT';
    }

    const estimatedQuantity = isPieceCategory(category) ? 1 : 2.5;

    return {
      category,
      condition,
      estimatedQuantity,
      proposedPath: category === 'E_WASTE' ? 'RECYCLE' : 'REUSE',
      confidence,
      isHazard: category === 'E_WASTE',
      rationale: '',
      suggestedAction: '',
    };
  },

  determineNextLifePath(category: Category, condition: Condition): Path {
    if (category === 'E_WASTE') return 'RECYCLE';

    if (category === 'APPLIANCES') {
      if (condition === 'EXCELLENT' || condition === 'GOOD') return 'RESELL';
      if (condition === 'FAIR') return 'REPAIR';
      return 'RECYCLE';
    }

    if (category === 'BOOKS' || category === 'CLOTHES') {
      if (condition === 'EXCELLENT') return 'DONATE';
      if (condition === 'GOOD') return 'RESELL';
      if (condition === 'FAIR') return 'REUSE';
      return 'RECYCLE';
    }

    if (category === 'FURNITURE') {
      if (condition === 'EXCELLENT' || condition === 'GOOD') return 'REUSE';
      if (condition === 'FAIR') return 'REPAIR';
      return 'RECYCLE';
    }

    return 'RECYCLE';
  },

  generateRationale(category: Category, condition: Condition, path: Path, _notes?: string | null): string {
    switch (path) {
      case 'RESELL':
        return `Item is in ${condition.toLowerCase()} condition with high residual utility. Reselling offers 3-5× higher financial return than scrap recycling.`;
      case 'REPAIR':
        return `Minor wear detected. Repairing this ${category.toLowerCase()} item restores full functional value for prolonged circular lifespan.`;
      case 'DONATE':
        return `Excellent condition suitable for campus donation drives and community reuse programs.`;
      case 'REUSE':
        return `Functional item in ${condition.toLowerCase()} shape. Direct reuse eliminates manufacturing footprint.`;
      case 'RECYCLE':
      default:
        return `High-yield scrap grade material suitable for industrial processing and Green Wallet credit redemption.`;
    }
  },

  generateSuggestedAction(path: Path, _category: Category): string {
    switch (path) {
      case 'RESELL':
        return 'Publish active listing on Chokro Marketplace to connect with nearby verified buyers.';
      case 'REPAIR':
        return 'Book a repair service or list in the Chokro Upcycling community section.';
      case 'DONATE':
        return 'Select a campus drop-off drive to donate and earn community impact points.';
      case 'RECYCLE':
      default:
        return `Drop at nearest Chokro Smart Bin or book a collector pickup for instant BDT credits.`;
    }
  },

  getDefaultPrice(category: Category, condition: Condition): number {
    const multipliers: Record<Condition, number> = {
      EXCELLENT: 1.3,
      GOOD: 1.0,
      FAIR: 0.8,
      POOR: 0.5,
    };
    const baseRates: Record<Category, number> = {
      PLASTICS: 45,
      PAPER: 25,
      METAL: 110,
      GLASS: 18,
      CLOTHES: 30,
      BOOKS: 35,
      FURNITURE: 95,
      APPLIANCES: 500,
      E_WASTE: 250,
    };
    const base = baseRates[category] || 30;
    const factor = multipliers[condition] || 1.0;
    return Math.round(base * factor);
  },
};
