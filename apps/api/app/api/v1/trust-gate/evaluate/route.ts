// POST /api/trust-gate/evaluate — admin only. Subject reference only; signals/flags are server-derived.
import { requireAdmin } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { TrustGateDomain } from '@/lib/domain/TrustGateDomain';
import { EvaluateTrustGateSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = EvaluateTrustGateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid trust gate evaluation payload', 400, parsed.error.format());
  }

  // Strict schema rejects caller-supplied signals/flags; only subjectType+subjectId reach domain
  const result = await TrustGateDomain.evaluateAndApply(parsed.data, {
    userId: auth.user.userId,
    role: auth.user.role,
  });

  return apiSuccess('Trust gate evaluation complete', result, 200);
});

export { OPTIONS };
