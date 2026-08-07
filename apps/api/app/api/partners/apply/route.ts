import { requireAuth } from '../../../../lib/auth';
import { apiError, apiSuccess, safeRoute } from '../../../../lib/http';
import { partnerRepo } from '../../../../lib/repos/partners';
import { PartnerApplySchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = PartnerApplySchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid application data', 400, parsed.error.format());
  }

  const { orgName, types, eWasteLicensed, doeLicenseDoc } = parsed.data;

  // Strict DoE License Gate Invariant
  if (eWasteLicensed && !doeLicenseDoc) {
    return apiError('DoE License document is mandatory for e-waste licensing.', 400);
  }

  // SPEC 00 §2.5: the e_waste_licensed capability is granted only by an admin
  // during verification, never self-asserted at application time.
  const partner = await partnerRepo.create({
    user_id: auth.user.userId,
    org_name: orgName,
    types,
    e_waste_licensed: false,
    doe_license_doc: doeLicenseDoc || null,
    status: 'APPLIED',
  });

  return apiSuccess('Partner application submitted', { partner }, 201);
});
