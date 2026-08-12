import { userRepo } from '@/lib/repos/users';
import { hashPassword, comparePassword, signToken, TokenPayload } from '@/lib/auth';
import type { Role } from '@chokro/shared';

export interface RegisterInput {
  email: string;
  password: string;
  role?: Role;
  institutionId?: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  institutionId?: string | null;
  institution_id?: string | null;
  createdAt?: Date | string;
  created_at?: Date | string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export const AuthDomain = {
  async register(input: RegisterInput): Promise<AuthSession> {
    const existing = await userRepo.findByEmail(input.email);
    if (existing) {
      throw new Error('Unable to create account');
    }

    const password_hash = hashPassword(input.password);
    const user = await userRepo.create({
      email: input.email,
      password_hash,
      role: 'INDIVIDUAL',
      institution_id: input.institutionId ?? null,
    });

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = signToken(payload);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        institutionId: user.institution_id,
        institution_id: user.institution_id,
        createdAt: user.created_at,
        created_at: user.created_at,
      },
    };
  },

  async authenticate(input: LoginInput): Promise<AuthSession> {
    const user = await userRepo.findByEmail(input.email);
    if (!user || !user.password_hash) {
      throw new Error('Invalid credentials');
    }

    const valid = comparePassword(input.password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = signToken(payload);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        institutionId: user.institution_id,
        institution_id: user.institution_id,
        createdAt: user.created_at,
        created_at: user.created_at,
      },
    };
  },

  async getUserProfile(userId: string): Promise<AuthUser | null> {
    const user = await userRepo.findById(userId);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institution_id,
      institution_id: user.institution_id,
      createdAt: user.created_at,
      created_at: user.created_at,
    };
  },
};
