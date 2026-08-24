// POST /api/auth/signup — public. Creates a new account and returns a session.
import { AuthDomain } from '@/lib/domain/AuthDomain';
import { apiError, apiSuccess, safeRoute } from '@/lib/http';
import { DatabaseUnavailableError } from '@/lib/database';
import { SignupSchema } from '@chokro/shared';

// Registers a new user; returns a session on success, otherwise the mapped error.
export const POST = safeRoute(async (req: Request) => {
  const body = await req.json();
  // Reject malformed payloads up front before touching the domain.
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid input', 400, parsed.error.format());
  }

  try {
    const session = await AuthDomain.register(parsed.data);
    return apiSuccess('Signup successful', session, 201);
  } catch (error) {
    // Re-raise infra failures so the global handler owns 503s; map domain failures to 400.
    if (error instanceof DatabaseUnavailableError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unable to create account';
    return apiError(message, 400);
  }
});
export { OPTIONS } from '@/lib/http';
