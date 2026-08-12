import { AuthDomain } from '@/lib/domain/AuthDomain';
import { apiError, apiSuccess, safeRoute } from '@/lib/http';
import { DatabaseUnavailableError } from '@/lib/database';
import { LoginSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid credentials', 401);
  }

  try {
    const session = await AuthDomain.authenticate(parsed.data);
    return apiSuccess('Login successful', session);
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Invalid credentials';
    return apiError(message, 401);
  }
});
