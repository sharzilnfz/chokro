// POST /api/negotiations — auth required. Creates a new negotiation thread with initial offer.
// GET /api/negotiations — auth required. Lists caller's negotiation threads.
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { NegotiationDomain } from '@/lib/domain/NegotiationDomain';
import { CreateNegotiationThreadSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = CreateNegotiationThreadSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid negotiation payload', 400, parsed.error.format());
  }

  const thread = await NegotiationDomain.createThread(auth.user.userId, parsed.data);
  return apiSuccess('Negotiation thread created', { thread }, 201);
});

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;

  const threads = await NegotiationDomain.listThreadsForUser(auth.user.userId, status);
  return apiData({ threads });
});

export { OPTIONS };
