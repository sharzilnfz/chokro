// POST /api/negotiations/[id]/accept — auth required. Accepts active pending offer and locks listing.
import { requireAuth } from '@/lib/auth';
import { apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { NegotiationDomain } from '@/lib/domain/NegotiationDomain';

export const POST = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const { id } = await params;

  const result = await NegotiationDomain.acceptOffer(auth.user.userId, id);
  return apiSuccess('Offer accepted and listing matched', result, 200);
});

export { OPTIONS };
