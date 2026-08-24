// GET /api/v1/admin/impact/certificates — admin only. Lists all issued ESG certificates (A12)
import { requireAdmin } from '@/lib/auth';
import { apiData, safeRoute } from '@/lib/http';
import { impactRepo } from '@/lib/repos/impact';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const certificates = await impactRepo.findAllCertificates();
  return apiData({ certificates });
});

export { OPTIONS } from '@/lib/http';
