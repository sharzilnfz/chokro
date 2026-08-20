// GET /api/admin/partners — admin only. Lists all partner applications.
// POST /api/admin/partners — admin only. Updates a partner's verification status.
import { requireAdmin } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { PartnerDomain } from '@/lib/domain/PartnerDomain';
import { VerifyPartnerSchema } from '@chokro/shared';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const partners = await PartnerDomain.listAllPartners();
  return apiData({ partners });
});

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const body = await req.json();
  const parsed = VerifyPartnerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid verification status', 400);
  }

  const { partnerId, status, reason } = parsed.data;

  try {
    const partner = await PartnerDomain.updateVerification(partnerId, status, undefined, reason);
    return apiSuccess(`Partner ${status.toLowerCase()}`, { partner });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update partner';
    if (message === 'Partner not found') {
      return apiError(message, 404);
    }
    return apiError(message, 400);
  }
});
export { OPTIONS } from '@/lib/http';
