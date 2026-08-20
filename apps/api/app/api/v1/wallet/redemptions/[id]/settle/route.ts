// POST /api/v1/wallet/redemptions/[id]/settle — admin only. Settle / adjudicate a redemption request (APPROVE, REJECT, RETRY).
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { SettlementDomain } from '@/lib/domain/SettlementDomain';
import { SettleRedemptionSchema } from '@chokro/shared';

export const POST = safeRoute(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await req.json();
    const parsed = SettleRedemptionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Invalid settlement payload', 400, parsed.error.format());
    }

    const result = await SettlementDomain.settleRedemption(
      id,
      parsed.data.action,
      auth.user.userId,
      parsed.data.reason
    );

    return apiSuccess(result.message || 'Settlement processed', result, 200);
  }
);

export { OPTIONS };
