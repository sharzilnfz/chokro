// POST /api/streaks/opt-out — auth required. Updates user leaderboard privacy opt-out.
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute } from '@/lib/http';
import { StreakDomain } from '@/lib/domain/StreakDomain';
import { OptOutSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = OptOutSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid opt-out payload', 400, parsed.error.format());
  }

  const streak = await StreakDomain.setOptOut(auth.user.userId, parsed.data.leaderboard_opt_out);
  return apiSuccess('Opt-out preference updated', { streak });
});
