// POST /api/trust-gate/evaluate — auth required. Evaluates a subject against trust signals, executes decision, and updates credit/status.
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { TrustGateDomain } from '@/lib/domain/TrustGateDomain';
import { EvaluateTrustGateSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = EvaluateTrustGateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid trust gate evaluation payload', 400, parsed.error.format());
  }

  const result = await TrustGateDomain.evaluateAndApply(parsed.data, {
    userId: auth.user.userId,
    role: auth.user.role,
  });

  return apiSuccess('Trust gate evaluation complete', result, 200);
});

export { OPTIONS };
