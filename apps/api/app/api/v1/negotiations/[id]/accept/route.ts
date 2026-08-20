// POST /api/negotiations/[id]/accept — auth required. Accepts active pending offer and locks listing.
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { NegotiationDomain, NegotiationRuleError } from '@/lib/domain/NegotiationDomain';

export const POST = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const { id } = await params;

  try {
    const result = await NegotiationDomain.acceptOffer(auth.user.userId, id);
    return apiSuccess('Offer accepted and listing matched', result, 200);
  } catch (err) {
    if (err instanceof NegotiationRuleError) {
      return apiError(err.message, err.status, err.details);
    }
    throw err;
  }
});

export { OPTIONS };
