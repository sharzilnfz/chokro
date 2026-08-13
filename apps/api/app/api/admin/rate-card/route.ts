import { requireAdmin } from '../../../../lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '../../../../lib/http';
import { rateCardRepo } from '../../../../lib/repos/rateCards';
import { RateCardSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = RateCardSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid rate card data', 400, parsed.error.format());
  }

  const { category, conditionBand, priceBdt } = parsed.data;
  const entry = await rateCardRepo.createEntry({
    category,
    condition_band: conditionBand,
    price_bdt: priceBdt,
    updated_by: auth.user.userId,
  });

  return apiSuccess('Rate card updated', { entry }, 201);
});

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const entries = await rateCardRepo.findAll();
  return apiData({ entries });
});
