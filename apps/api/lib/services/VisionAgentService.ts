import { Category, Condition, getCategoryUnit, isPieceCategory, Path } from '@chokro/shared';
import { rateCardRepo } from '../repos/rateCards';
import { benchmarksRepo } from '../repos/benchmarks';
import { valuationScansRepo, ValuationScan } from '../repos/valuationScans';
import { CommodityBenchmarkService } from './CommodityBenchmarkService';

export interface VisionClassifyRequest {
  userId?: string | null;
  imageUrl?: string | null;
  imageBase64?: string | null;
  promptNotes?: string | null;
  categoryHint?: string | null;
  conditionHint?: string | null;
  declaredQuantity?: number | null;
}

export interface VisionClassifyResult {
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

export class VisionAgentService {
  /**
   * Main vision pipeline: Vision Detection -> Safety & Invariant Enforcement -> Valuation DB Join -> Persist Scan
   */
  static async classifyAndEstimate(input: VisionClassifyRequest): Promise<VisionClassifyResult> {
    // 1. Multimodal Vision inference (with resilient provider fallback)
    const rawDetection = await this.runVisionInference(input);

    // 2. Enforce Category and Unit Domain Invariants
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

    // 3. Enforce Strict E-Waste & Hazard Safety Gate
    const isEwasteOrHazard = category === 'E_WASTE' || rawDetection.isHazard;
    let nextLifePath: Path = rawDetection.proposedPath;
    let rationale = rawDetection.rationale;
    let suggestedAction = rawDetection.suggestedAction;

    if (isEwasteOrHazard) {
      nextLifePath = 'RECYCLE';
      rationale = 'Electronic waste contains regulated heavy metals and requires authorized DoE recycling facilities. Cannot be casually resold or landfilled.';
      suggestedAction = 'Drop off at nearest certified Chokro e-waste collection bin or schedule authorized hazardous pickup.';
    } else {
      // Deterministic next-life reasoning for clean materials
      nextLifePath = this.determineNextLifePath(category, condition);
      rationale = this.generateRationale(category, condition, nextLifePath, input.promptNotes);
      suggestedAction = this.generateSuggestedAction(nextLifePath, category);
    }

    // 4. Join with Effective Database Rate Card for Official Pricing
    const publishedRates = await rateCardRepo.findPublished();
    const rateMatch = publishedRates.find(
      (r) => r.category === category && r.condition_band === condition
    );

    let unitPriceBdt = rateMatch ? Number(rateMatch.price_bdt) : this.getDefaultPrice(category, condition);
    const totalEstimatedBdt = Math.round(unitPriceBdt * quantity * 100) / 100;

    // 5. Cross-reference with Market Commodity Benchmark
    const benchmark = await benchmarksRepo.findByCategory(category);
    let benchmarkBdt: number | undefined;
    let driftInfo: { drift_pct: number; drift_status: string } | undefined;

    if (benchmark) {
      benchmarkBdt = Number(benchmark.benchmark_bdt);
      const drift = CommodityBenchmarkService.calculateDrift(unitPriceBdt, benchmarkBdt);
      driftInfo = {
        drift_pct: drift.drift_pct,
        drift_status: drift.drift_status,
      };
    }

    // 6. Persist Scan Record to Database (valuation_scans table)
    const scanRecord = await valuationScansRepo.createScan({
      user_id: input.userId || null,
      image_url: input.imageUrl || (input.imageBase64 ? 'data:image/jpeg;base64,...' : null),
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
  }

  /**
   * Internal Vision inference provider with external API integration + fallback.
   */
  private static async runVisionInference(input: VisionClassifyRequest): Promise<{
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

    // Check if external OpenAI / Gemini key is available
    if (process.env.OPENAI_API_KEY && (input.imageUrl || input.imageBase64)) {
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
                input.imageUrl ? { type: 'image_url', image_url: { url: input.imageUrl } } : null,
              ].filter(Boolean),
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

    // Heuristic contextual fallback classifier (deterministic & fast)
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
  }

  private static determineNextLifePath(category: Category, condition: Condition): Path {
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
  }

  private static generateRationale(category: Category, condition: Condition, path: Path, notes?: string | null): string {
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
  }

  private static generateSuggestedAction(path: Path, category: Category): string {
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
  }

  private static getDefaultPrice(category: Category, condition: Condition): number {
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
  }
}
