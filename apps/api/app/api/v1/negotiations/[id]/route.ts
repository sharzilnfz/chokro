// GET /api/negotiations/[id] — auth required. Gets details of a negotiation thread.
import { requireAuth } from '@/lib/auth';
import { apiData, safeRoute, OPTIONS } from '@/lib/http';
import { NegotiationDomain } from '@/lib/domain/NegotiationDomain';

export const GET = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const { id } = await params;

  const thread = await NegotiationDomain.getThreadById(auth.user.userId, id, auth.user.role);
  return apiData({ thread });
});

export { OPTIONS };
