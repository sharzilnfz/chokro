// POST /api/admin/trust-gate/[id]/adjudicate — admin only. Adjudicate an escalated decision (VERIFY or REJECT).
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { HandoverDomain } from '@/lib/domain/HandoverDomain';
import { AdjudicateDecisionSchema } from '@chokro/shared';

export const POST = safeRoute(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await req.json();
    const parsed = AdjudicateDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Invalid adjudication payload', 400, parsed.error.format());
    }

    if (parsed.data.action === 'REJECT' && (!parsed.data.reason || parsed.data.reason.trim().length === 0)) {
      return apiError('Rejection requires a mandatory explanation reason', 400);
    }

    const result = await HandoverDomain.adjudicateDecision(
      id,
      parsed.data,
      auth.user.userId
    );

    return apiSuccess('Decision adjudicated successfully', result, 200);
  }
);

export { OPTIONS };
