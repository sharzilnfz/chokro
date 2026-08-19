// GET /api/rate-card/estimate — public. Returns the published price for a given
// category + condition combination.
import { NextRequest } from 'next/server';
import { apiData, apiError, safeRoute } from '../../../../lib/http';
import { rateCardRepo } from '../../../../lib/repos/rateCards';

// Looks up a published price; both category and condition are required.
export const GET = safeRoute(async (request: Request) => {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const condition = url.searchParams.get('condition');

  if (!category || !condition) {
    return apiError('Missing required query parameters: category, condition', 400);
  }

  const rates = await rateCardRepo.findPublished();
  
  // Match the requested combo against the published rate entries.
  const match = rates.find(
    (rate) => rate.category === category && rate.condition_band === condition
  );

  if (!match) {
    return apiError('No rate card entry found for this category and condition', 404);
  }

  // Return the quote fields a client would display next to the estimate.
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
