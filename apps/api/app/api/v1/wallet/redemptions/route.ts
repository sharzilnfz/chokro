// POST /api/v1/wallet/redemptions — auth required. Submits a cash-out redemption request.
// GET /api/v1/wallet/redemptions — auth required. Returns user's redemption request history.
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, apiData, safeRoute, OPTIONS } from '@/lib/http';
import { SettlementDomain } from '@/lib/domain/SettlementDomain';
import { settlementRepo } from '@/lib/repos/settlement';
import { CreateRedemptionSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = CreateRedemptionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid redemption request data', 400, parsed.error.format());
  }

  const result = await SettlementDomain.requestRedemption(parsed.data, auth.user.userId);
  return apiSuccess('Redemption request submitted successfully', result, 201);
});

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const redemptions = await settlementRepo.findRedemptionsByUser(auth.user.userId);
  return apiData({ redemptions });
});

export { OPTIONS };
