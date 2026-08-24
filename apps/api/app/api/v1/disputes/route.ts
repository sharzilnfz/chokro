import { CreateDisputeSchema } from '@chokro/shared';
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { DisputeDomain } from '@/lib/domain/DisputeDomain';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const disputes = await DisputeDomain.listDisputes();
  const filtered = auth.user.role === 'ADMIN'
    ? disputes
    : disputes.filter((d) => d.opened_by === auth.user.userId || d.against_user_id === auth.user.userId);

  return apiData({ disputes: filtered, count: filtered.length });
});

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const parsed = CreateDisputeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError('Invalid dispute payload', 400, parsed.error.format());
  }

  const dispute = await DisputeDomain.createDispute({
    sourceType: parsed.data.sourceType,
    sourceId: parsed.data.sourceId,
    openedBy: auth.user.userId,
    againstUserId: parsed.data.againstUserId,
    reason: parsed.data.reason,
    evidenceUrls: parsed.data.evidenceUrls,
  });

  return apiSuccess('Dispute opened successfully', { dispute }, 201);
});

export { OPTIONS } from '@/lib/http';
