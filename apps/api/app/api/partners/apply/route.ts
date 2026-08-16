// POST /api/partners/apply — auth required. Submits a partner application.
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute } from '@/lib/http';
import { PartnerDomain } from '@/lib/domain/PartnerDomain';
import { PartnerApplySchema } from '@chokro/shared';

// Submits a partner application on behalf of the caller.
export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = PartnerApplySchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid application data', 400, parsed.error.format());
  }

  const { orgName, types, eWasteLicensed, doeLicenseDoc, capabilityFlags } = parsed.data;

  // Strict DoE License Gate Invariant
  if (eWasteLicensed && !doeLicenseDoc) {
    return apiError('DoE License document is mandatory for e-waste licensing.', 400);
  }

  // Persist the application and echo the created partner record on success.
  try {
    const partner = await PartnerDomain.apply({
      userId: auth.user.userId,
      orgName,
      types,
      eWasteLicensed,
      doeLicenseDoc,
      capabilityFlags,
    });

    return apiSuccess('Partner application submitted', { partner }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Partner application failed';
    return apiError(message, 400);
  }
});
