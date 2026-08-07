import { NextResponse } from 'next/server';
import { userRepo } from '../../../../lib/repos/users';
import { requireAuth } from '../../../../lib/auth';
import { apiError, safeRoute } from '../../../../lib/http';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const user = await userRepo.findById(auth.user.userId);

  if (!user) {
    return apiError('Unauthorized', 401);
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institution_id,
      createdAt: user.created_at,
    },
  });
});
