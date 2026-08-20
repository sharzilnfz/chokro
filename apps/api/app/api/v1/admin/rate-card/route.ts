// POST /api/admin/rate-card — admin only. Adds a price entry to the rate card.
// GET /api/admin/rate-card — admin only. Lists all rate card entries.
import { requireAdmin } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { rateCardRepo } from '@/lib/repos/rateCards';
import { RateCardSchema } from '@chokro/shared';

// Adds a new pricing entry and records which admin set the price.
export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = RateCardSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid rate card data', 400, parsed.error.format());
  }

  // Map shared-schema fields onto the repo shape, attributing the change to this admin.
  const { category, conditionBand, priceBdt } = parsed.data;
  const entry = await rateCardRepo.createEntry({
    category,
    condition_band: conditionBand,
    price_bdt: priceBdt,
    updated_by: auth.user.userId,
  });

  return apiSuccess('Rate card updated', { entry }, 201);
});

// Returns every rate card entry for review and maintenance.
export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const entries = await rateCardRepo.findAll();
  return apiData({ entries });
});

export { OPTIONS } from '@/lib/http';

