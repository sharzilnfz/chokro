// GET /api/v1/admin/partners/kyc/queue — Admin only. Lists partner KYC adjudication queue.
import { requireAdmin } from '@/lib/auth';
import { apiData, safeRoute } from '@/lib/http';
import { PartnerKycDomain } from '@/lib/domain/PartnerKycDomain';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;

  const queue = await PartnerKycDomain.getAdjudicationQueue(status);
  return apiData({ queue });
});

export { OPTIONS } from '@/lib/http';
