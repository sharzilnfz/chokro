// GET /api/rate-card/published — public. Returns the published rate card entries.
import { apiData, safeRoute } from '../../../../lib/http';
import { rateCardRepo } from '../../../../lib/repos/rateCards';
import { benchmarksRepo } from '../../../../lib/repos/benchmarks';
import { CommodityBenchmarkService } from '../../../../lib/services/CommodityBenchmarkService';

// Returns the currently published pricing entries for consumers to quote against.
export const GET = safeRoute(async () => {
  const rates = await rateCardRepo.findPublished();
  const benchmarks = await benchmarksRepo.findAll();
  const benchmarkMap = new Map(benchmarks.map((b) => [b.category, b]));

  const enrichedRates = rates.map((rate) => {
    const bm = benchmarkMap.get(rate.category);
    if (!bm) return rate;

    const benchBdt = Number(bm.benchmark_bdt);
    const drift = CommodityBenchmarkService.calculateDrift(Number(rate.price_bdt), benchBdt);

    return {
      ...rate,
      market_benchmark_bdt: benchBdt,
      drift_pct: drift.drift_pct,
      drift_status: drift.drift_status,
      drift_badge: drift.badge_text,
    };
  });

  return apiData({ rates: enrichedRates });
});

export { OPTIONS } from '../../../../lib/http';


