import { userRepo } from '../../../../lib/repos/users';
import { comparePassword, signToken } from '../../../../lib/auth';
import { apiError, apiSuccess, safeRoute } from '../../../../lib/http';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const POST = safeRoute(async (req: Request) => {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid credentials', 401);
  }

  const { email, password } = parsed.data;
  const user = await userRepo.findByEmail(email);

  if (!user) {
    return apiError('Invalid credentials', 401);
  }

  const isValid = comparePassword(password, user.password_hash);
  if (!isValid) {
    return apiError('Invalid credentials', 401);
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return apiSuccess('Login successful', {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institution_id,
    },
    token,
  });
});
