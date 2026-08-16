import { requireAuth } from '@/lib/auth';
import { apiData, safeRoute } from '@/lib/http';
import { partnerRepo } from '@/lib/repos/partners';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const partner = await partnerRepo.findByUserId(auth.user.userId);
  return apiData({ partner: partner ?? null });
});

export { OPTIONS } from '@/lib/http';
