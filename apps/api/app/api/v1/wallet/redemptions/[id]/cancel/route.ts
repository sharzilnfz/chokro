// POST /api/v1/wallet/redemptions/[id]/cancel — auth required. User cancels an open redemption request.
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { SettlementDomain } from '@/lib/domain/SettlementDomain';
import { CancelRedemptionSchema } from '@chokro/shared';

export const POST = safeRoute(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const auth = requireAuth(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    let reason: string | undefined = undefined;

    try {
      const body = await req.json();
      const parsed = CancelRedemptionSchema.safeParse(body);
      if (parsed.success) {
        reason = parsed.data.reason || undefined;
      }
    } catch {
      // Empty body is acceptable
    }

    const result = await SettlementDomain.cancelRedemption(id, auth.user.userId, reason);
    return apiSuccess('Redemption cancelled successfully', result, 200);
  }
);

export { OPTIONS };
