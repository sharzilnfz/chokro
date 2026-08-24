// GET /api/v1/admin/wallet/redemptions — admin only. Returns redemption requests queue with pagination and status filters (A10).
import { requireAdmin } from '@/lib/auth';
import { apiData, safeRoute, OPTIONS } from '@/lib/http';
import { settlementRepo } from '@/lib/repos/settlement';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const redemptions = await settlementRepo.findAllRedemptions({ status, limit, offset });
  return apiData({ redemptions });
});

export { OPTIONS };
