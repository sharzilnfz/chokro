// DELETE /api/v1/media/[id] — delete media asset (Spec 16 / Ticket 03)
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, safeRoute, OPTIONS } from '@/lib/http';
import { MediaDomain } from '@/lib/domain/MediaDomain';

export { OPTIONS };

export const DELETE = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const { id } = await params;
  if (!id) {
    return apiError('Missing media ID', 400);
  }

  const result = await MediaDomain.deleteMedia(id, auth.user.userId, auth.user.role);
  return apiData(result, 200);
});
