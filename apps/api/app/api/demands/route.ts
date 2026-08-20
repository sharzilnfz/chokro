// POST /api/demands — auth required. Creates a standing recycler demand.
// GET /api/demands — auth required. Lists caller's active/past demands.
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { DemandBoardDomain } from '@/lib/domain/DemandBoardDomain';
import { CreateDemandSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = CreateDemandSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid demand payload', 400, parsed.error.format());
  }

  const demand = await DemandBoardDomain.createDemand(auth.user.userId, parsed.data);
  return apiSuccess('Demand created', { demand, demandId: demand.id, status: demand.status, expiresAt: demand.expires_at }, 201);
});

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;

  const demands = await DemandBoardDomain.getDemandsByBuyer(auth.user.userId, status);
  return apiData({ demands });
});
