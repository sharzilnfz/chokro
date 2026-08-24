// POST /api/trust-gate/contest — auth required. Submits a one-time decision contest appeal.
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { HandoverDomain } from '@/lib/domain/HandoverDomain';
import { ContestDecisionSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = ContestDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid contest appeal payload', 400, parsed.error.format());
  }

  const contest = await HandoverDomain.contestDecision(
    parsed.data,
    auth.user.userId
  );

  return apiSuccess('Decision contest appeal submitted successfully', { contest }, 201);
});

export { OPTIONS };
