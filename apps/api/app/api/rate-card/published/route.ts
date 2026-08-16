// GET /api/rate-card/published — public. Returns the published rate card entries.
import { apiData, safeRoute } from '../../../../lib/http';
import { rateCardRepo } from '../../../../lib/repos/rateCards';

// Returns the currently published pricing entries for consumers to quote against.
export const GET = safeRoute(async () => {
  const rates = await rateCardRepo.findPublished();
  return apiData({ rates });
});
