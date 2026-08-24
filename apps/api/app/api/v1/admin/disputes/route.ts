import { requireAuth } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';
import { DisputeDomain } from '@/lib/domain/DisputeDomain';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  if (auth.user.role !== 'ADMIN') {
    return apiError('Admin access required', 403);
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const sourceType = url.searchParams.get('sourceType') || undefined;

  const disputes = await DisputeDomain.listDisputes({ status, sourceType });
  return apiData({ disputes, count: disputes.length });
});

export { OPTIONS } from '@/lib/http';
