// GET /api/auth/me — auth required. Returns the current user's profile.
import { AuthDomain } from '@/lib/domain/AuthDomain';
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';

// Returns the caller's own profile; treated as unauthorized if the user no longer exists.
export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  // A valid session whose user was deleted is surfaced the same way as no session.
  const user = await AuthDomain.getUserProfile(auth.user.userId);
  if (!user) {
    return apiError('Unauthorized', 401);
  }

  return apiData({ user });
});
export { OPTIONS } from '@/lib/http';
