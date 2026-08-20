// POST /api/negotiations/[id]/reject — auth required. Rejects active pending offer.
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { NegotiationDomain, NegotiationRuleError } from '@/lib/domain/NegotiationDomain';
import { RejectOfferSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const { id } = await params;

  let reason: string | undefined;
  try {
    const text = await req.text();
    if (text) {
      const body = JSON.parse(text);
      const parsed = RejectOfferSchema.safeParse(body);
      if (parsed.success && parsed.data.reason) {
        reason = parsed.data.reason;
      }
    }
  } catch {
    // optional body
  }

  try {
    const offer = await NegotiationDomain.rejectOffer(auth.user.userId, id, reason);
    return apiSuccess('Offer rejected', { offer }, 200);
  } catch (err) {
    if (err instanceof NegotiationRuleError) {
      return apiError(err.message, err.status, err.details);
    }
    throw err;
  }
});

export { OPTIONS };
