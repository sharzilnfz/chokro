// POST /api/deposits — auth required. Records a physical deposit and mints pending credit.
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute } from '@/lib/http';
import { DepositDomain } from '@/lib/domain/DepositDomain';
import { RecordDepositSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = RecordDepositSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid deposit payload', 400, parsed.error.format());
  }

  const result = await DepositDomain.recordDeposit({
    userId: auth.user.userId,
    sessionId: parsed.data.sessionId,
    category: parsed.data.category,
    declaredQuantity: parsed.data.declaredQuantity,
    unit: parsed.data.unit,
    evidenceUrl: parsed.data.evidenceUrl,
  });

  return apiSuccess('Deposit recorded and pending credit minted', result, 201);
});
