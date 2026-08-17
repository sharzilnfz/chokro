// GET /api/admin/campuses — admin only. Lists all registered campuses (or filtered by status).
// POST /api/admin/campuses — admin only. Creates a new campus with unique slug and verified status.
import { requireAdmin } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { CampusDomain } from '@/lib/domain/CampusDomain';
import { CreateCampusSchema } from '@chokro/shared';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const campuses = await CampusDomain.listAll(status);
  return apiData({ campuses });
});

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const body = await req.json();
  const parsed = CreateCampusSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid campus data', 400, parsed.error.format());
  try {
    const campus = await CampusDomain.create({
      ...parsed.data,
      status: parsed.data.status || 'VERIFIED',
    });
    return apiSuccess('Campus added', { campus }, 201);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Failed to add campus', 400);
  }
});
