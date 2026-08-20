// GET /api/partners/me — auth required. Returns caller's partner application status.
// PATCH /api/partners/me — auth required. Updates caller's partner operational capability flags.
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { PartnerDomain } from '@/lib/domain/PartnerDomain';
import { PartnerCapabilityFlagsSchema } from '@chokro/shared';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const partner = await PartnerDomain.getPartnerByUserId(auth.user.userId);
  if (!partner) {
    return apiError('Partner application not found', 404);
  }

  return apiData({ partner });
});

export const PATCH = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const partner = await PartnerDomain.getPartnerByUserId(auth.user.userId);
  if (!partner) {
    return apiError('Partner application not found', 404);
  }

  const body = await req.json();
  const parsed = PartnerCapabilityFlagsSchema.safeParse(body.capabilityFlags ?? body);
  if (!parsed.success) {
    return apiError('Invalid capability flags', 400, parsed.error.format());
  }

  const updated = await PartnerDomain.updateCapabilities(partner.id, parsed.data);
  return apiSuccess('Capabilities updated', { partner: updated });
});

export { OPTIONS };
