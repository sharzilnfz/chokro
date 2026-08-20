// POST /api/drop-sessions — auth required. Opens a 15-minute single-use deposit session.
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute } from '@/lib/http';
import { DepositDomain } from '@/lib/domain/DepositDomain';
import { CreateDropSessionSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = CreateDropSessionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid session request', 400, parsed.error.format());
  }

  const result = await DepositDomain.createSession({
    userId: auth.user.userId,
    qrToken: parsed.data.qrToken,
    zoneId: parsed.data.zoneId,
  });

  return apiSuccess('Deposit session opened', result, 201);
});
