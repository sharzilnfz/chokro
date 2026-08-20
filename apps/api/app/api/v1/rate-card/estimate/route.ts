import { apiData, apiError, safeRoute } from '@/lib/http';
import { ValuationDomain } from '@/lib/domain/ValuationDomain';
import { EstimateQuerySchema, type Category, type Condition } from '@chokro/shared';

// Looks up a published price; both category and condition are required.
export const GET = safeRoute(async (request: Request) => {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const condition = url.searchParams.get('condition');

  if (!category || !condition) {
    return apiError('Missing required query parameters: category, condition', 400);
  }

  const parsed = EstimateQuerySchema.safeParse({
    category,
    condition,
    weight: url.searchParams.get('weight') || undefined,
    pieceCount: url.searchParams.get('pieceCount') || url.searchParams.get('piece_count') || undefined,
  });
  if (!parsed.success) {
    return apiError('Invalid query parameters', 400, parsed.error.format());
  }
  const { weight, pieceCount } = parsed.data;

  const quantity = pieceCount !== undefined ? Math.max(1, pieceCount) : (weight !== undefined ? Math.max(0.1, weight) : 1.0);

  const estimate = await ValuationDomain.estimateRate({
    category: category as Category,
    condition: condition as Condition,
    quantity,
  });

  if (!estimate) {
    return apiError('No rate card entry found for this category and condition', 404);
  }

  // Return the quote fields a client would display next to the estimate.
  return apiData({
    estimate: {
      price_bdt: estimate.price_bdt,
      unit: estimate.unit,
      category: estimate.category,
      condition_band: estimate.condition_band,
      quantity: estimate.quantity,
      total_bdt: estimate.total_bdt,
      market_benchmark: estimate.market_benchmark
        ? {
            benchmark_bdt: estimate.market_benchmark.benchmark_bdt,
            drift_pct: estimate.market_benchmark.drift_pct,
            drift_status: estimate.market_benchmark.drift_status,
            badge_text: estimate.market_benchmark.badge_text,
            source: estimate.market_benchmark.source,
          }
        : null,
    },
  });
});

export { OPTIONS } from '@/lib/http';
