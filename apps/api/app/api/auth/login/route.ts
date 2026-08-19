// POST /api/auth/login — public. Validates credentials and returns a session.
import { AuthDomain } from '@/lib/domain/AuthDomain';
import { apiError, apiSuccess, safeRoute } from '@/lib/http';
import { DatabaseUnavailableError } from '@/lib/database';
import { LoginSchema } from '@chokro/shared';

// Authenticates the caller and returns a session, or 401 for bad credentials.
export const POST = safeRoute(async (req: Request) => {
  const body = await req.json();
  // Validate the shape first so malformed logins never reach the auth domain.
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid credentials', 401);
  }

  try {
    const session = await AuthDomain.authenticate(parsed.data);
    return apiSuccess('Login successful', session);
  } catch (error) {
    // Re-raise infra failures so the global handler owns 503s; treat domain errors as 401.
    if (error instanceof DatabaseUnavailableError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Invalid credentials';
    return apiError(message, 401);
  }
});
