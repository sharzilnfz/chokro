import { NextRequest } from 'next/server';
import { apiData, apiError, safeRoute } from '../../../../lib/http';
import { rateCardRepo } from '../../../../lib/repos/rateCards';

export const GET = safeRoute(async (request: NextRequest) => {
  const category = request.nextUrl.searchParams.get('category');
  const condition = request.nextUrl.searchParams.get('condition');

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

  return apiData({
    estimate: {
      price_bdt: match.price_bdt,
      unit: match.unit,
      category: match.category,
      condition_band: match.condition_band,
    },
  });
});

export { OPTIONS } from '../../../../lib/http';
