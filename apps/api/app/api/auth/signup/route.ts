import { userRepo } from '../../../../lib/repos/users';
import { hashPassword, signToken } from '../../../../lib/auth';
import { apiError, apiSuccess, safeRoute } from '../../../../lib/http';
import { SignupSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const body = await req.json();
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid input', 400, parsed.error.format());
  }

  const { email, password, institutionId } = parsed.data;
  const password_hash = hashPassword(password);
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    return apiError('Unable to create account', 400);
  }

  const newUser = await userRepo.create({
    email,
    password_hash,
    role: 'INDIVIDUAL',
    institution_id: institutionId || null,
  });

  const token = signToken({
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
  });

  return apiSuccess('Signup successful', {
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      institutionId: newUser.institution_id,
    },
    token,
  }, 201);
});
