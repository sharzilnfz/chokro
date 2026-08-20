// GET /api/v1/admin/wallet/liability — admin only. Returns platform liability metrics, active caps, and audit history (A11).
// POST / PUT /api/v1/admin/wallet/liability — admin only. Updates dynamic liability caps with audit trail.
import { requireAdmin } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { SettlementDomain } from '@/lib/domain/SettlementDomain';
import { settlementRepo } from '@/lib/repos/settlement';
import { UpdateLiabilityCapSchema } from '@chokro/shared';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const [summary, activeCaps, capsHistory] = await Promise.all([
    SettlementDomain.getLiabilitySummary(),
    settlementRepo.getActiveLiabilityCaps(),
    settlementRepo.getLiabilityCapHistory(),
  ]);

  return apiData({ summary, activeCaps, capsHistory });
});

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = UpdateLiabilityCapSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid liability cap parameters', 400, parsed.error.format());
  }

  const updated = await SettlementDomain.updateCaps(parsed.data, auth.user.userId);
  return apiSuccess('Liability caps updated successfully', { activeCaps: updated }, 200);
});

export const PUT = POST;

export { OPTIONS };
