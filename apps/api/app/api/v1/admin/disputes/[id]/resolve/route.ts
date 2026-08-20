import { ResolveDisputeSchema } from '@chokro/shared';
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute } from '@/lib/http';
import { DisputeDomain, DisputeRuleError } from '@/lib/domain/DisputeDomain';
import { EscrowRuleError } from '@/lib/domain/EscrowDomain';

export const POST = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  if (auth.user.role !== 'ADMIN') {
    return apiError('Admin access required', 403);
  }

  const { id } = await params;

  const parsed = ResolveDisputeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError('Invalid resolution payload', 400, parsed.error.format());
  }

  try {
    const dispute = await DisputeDomain.resolveDispute({
      disputeId: id,
      adminUserId: auth.user.userId,
      resolution: parsed.data.resolution,
      resolutionNotes: parsed.data.resolutionNotes,
      buyerAmountBdt: parsed.data.buyerAmountBdt,
      sellerAmountBdt: parsed.data.sellerAmountBdt,
    });

    return apiSuccess('Dispute resolved successfully', { dispute }, 200);
  } catch (err) {
    if (err instanceof DisputeRuleError || err instanceof EscrowRuleError) {
      return apiError(err.message, err.status, err.details);
    }
    throw err;
  }
});

export { OPTIONS } from '@/lib/http';
