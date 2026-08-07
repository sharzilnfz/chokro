import { apiData, safeRoute } from '../../../../lib/http';
import { rateCardRepo } from '../../../../lib/repos/rateCards';

export const GET = safeRoute(async () => {
  const rates = await rateCardRepo.findPublished();
  return apiData({ rates });
});
