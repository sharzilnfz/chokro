// PATCH /api/admin/campuses/[id] — admin only. Updates campus status (verify, blacklist, restore) and reason.
// DELETE /api/admin/campuses/[id] — admin only. Deletes a campus if no student members are linked.
import { requireAdmin } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { CampusDomain } from '@/lib/domain/CampusDomain';
import { UpdateCampusStatusSchema } from '@chokro/shared';

export const PATCH = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateCampusStatusSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid status update', 400, parsed.error.format());

  try {
    const campus = await CampusDomain.updateStatus(id, parsed.data.status, parsed.data.reason ?? null);
    return apiData({ campus });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Failed to update campus status', 400);
  }
});

export const DELETE = safeRoute(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAdmin(_req);
  if (auth.response) return auth.response;
  const { id } = await params;
  try {
    await CampusDomain.remove(id);
    return apiSuccess('Campus removed');
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Failed to remove campus', 400);
  }
});
