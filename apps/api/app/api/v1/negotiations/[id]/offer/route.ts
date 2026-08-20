// POST /api/negotiations/[id]/offer — auth required. Submits a counter-offer in a thread.
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { NegotiationDomain, NegotiationRuleError } from '@/lib/domain/NegotiationDomain';
import { CreateCounterOfferSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const { id } = await params;

  const body = await req.json();
  const parsed = CreateCounterOfferSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid counter-offer payload', 400, parsed.error.format());
  }

  try {
    const offer = await NegotiationDomain.submitCounterOffer(auth.user.userId, id, parsed.data);
    return apiSuccess('Counter-offer submitted', { offer }, 201);
  } catch (err) {
    if (err instanceof NegotiationRuleError) {
      return apiError(err.message, err.status, err.details);
    }
    throw err;
  }
});

export { OPTIONS };
