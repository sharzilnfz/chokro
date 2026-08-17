// GET /api/profile — auth required. Fetches the caller's profile.
// PATCH /api/profile — auth required. Updates caller's profile (name, phone, campus link, student ID photo).
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';
import { ProfileDomain } from '@/lib/domain/ProfileDomain';
import { ProfileUpdateSchema } from '@chokro/shared';

import { DatabaseUnavailableError } from '@/lib/database';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const profile = await ProfileDomain.getProfile(auth.user.userId);
  if (!profile) return apiError('Unauthorized', 401);
  return apiData({ user: profile });
});

export const PATCH = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const body = await req.json();
  const parsed = ProfileUpdateSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid profile data', 400, parsed.error.format());
  try {
    const user = await ProfileDomain.update(auth.user.userId, parsed.data);
    return apiData({ user });
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) throw error;
    return apiError(error instanceof Error ? error.message : 'Failed to update profile', 400);
  }
});
