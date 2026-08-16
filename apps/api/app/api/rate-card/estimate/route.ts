import { apiData, apiError, safeRoute } from '../../../../lib/http';
import { rateCardRepo } from '../../../../lib/repos/rateCards';
import { benchmarksRepo } from '../../../../lib/repos/benchmarks';
import { CommodityBenchmarkService } from '../../../../lib/services/CommodityBenchmarkService';

export const GET = safeRoute(async (request: Request) => {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const condition = url.searchParams.get('condition');
  const weight = url.searchParams.get('weight');
  const pieceCount = url.searchParams.get('pieceCount') || url.searchParams.get('piece_count');

  if (!category || !condition) {
    return apiError('Missing required query parameters: category, condition', 400);
  }

  const rates = await rateCardRepo.findPublished();
  
  const match = rates.find(
    (rate) => rate.category === category && rate.condition_band === condition
  );

  if (!match) {
    return apiError('No rate card entry found for this category and condition', 404);
  }

  const unitPrice = Number(match.price_bdt);
  let quantity: number | null = null;
  let totalBdt: number | null = null;

  if (match.unit === 'piece' && pieceCount) {
    quantity = Math.max(1, parseInt(pieceCount, 10));
    totalBdt = Math.round(unitPrice * quantity * 100) / 100;
  } else if (match.unit === 'kg' && weight) {
    quantity = Math.max(0.1, parseFloat(weight));
    totalBdt = Math.round(unitPrice * quantity * 100) / 100;
  }

  // Cross-reference with commodity benchmark
  const benchmark = await benchmarksRepo.findByCategory(category);
  let benchmarkInfo = null;

  if (benchmark) {
    const benchPrice = Number(benchmark.benchmark_bdt);
    const drift = CommodityBenchmarkService.calculateDrift(unitPrice, benchPrice);
    benchmarkInfo = {
      benchmark_bdt: benchPrice,
      drift_pct: drift.drift_pct,
      drift_status: drift.drift_status,
      badge_text: drift.badge_text,
      source: benchmark.source,
    };
  }

  return apiData({
    estimate: {
      price_bdt: match.price_bdt,
      unit: match.unit,
      category: match.category,
      condition_band: match.condition_band,
      quantity: quantity ?? (match.unit === 'piece' ? 1 : 1.0),
      total_bdt: totalBdt !== null ? totalBdt : unitPrice,
      market_benchmark: benchmarkInfo,
    },
  });
});

export { OPTIONS } from '../../../../lib/http';

