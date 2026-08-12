import { AuthDomain } from '@/lib/domain/AuthDomain';
import { apiError, apiSuccess, safeRoute } from '@/lib/http';
import { DatabaseUnavailableError } from '@/lib/database';
import { SignupSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const body = await req.json();
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid input', 400, parsed.error.format());
  }

  try {
    const session = await AuthDomain.register(parsed.data);
    return apiSuccess('Signup successful', session, 201);
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unable to create account';
    return apiError(message, 400);
  }
});
