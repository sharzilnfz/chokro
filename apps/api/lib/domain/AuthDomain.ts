// AuthDomain: orchestrates account registration, login, and profile lookup,
// mapping DB rows to the caller-facing AuthUser shape.
//
// User repo + auth primitives that back the register/authenticate flows.
import { userRepo } from '@/lib/repos/users';
import { hashPassword, comparePassword, signToken } from '@/lib/auth';
import type { Role } from '@chokro/shared';

// Registration payload; role and institution binding are optional inputs.
export interface RegisterInput {
  email: string;
  password: string;
  role?: Role;
  institutionId?: string | null;
}

// Sign-in payload: only credentials, no role or institution.
export interface LoginInput {
  email: string;
  password: string;
}

// Caller-facing user shape (camelCase) returned from every auth operation.
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  institutionId?: string | null;
  createdAt?: Date | string;
}

// Success result: the signed session token together with the authenticated user.
export interface AuthSession {
  token: string;
  user: AuthUser;
}

// Translates a DB row (snake_case columns) into the camelCase AuthUser shape.
function toAuthUser(user: { id: string; email: string; role: Role; institution_id?: string | null; created_at?: Date | string }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    institutionId: user.institution_id,
    createdAt: user.created_at,
  };
}

// Application logic for the user lifecycle: register, authenticate, profile lookup.
export const AuthDomain = {
  // Full sign-up: uniqueness check, hashing, account insert, then token issuance.
  async register(input: RegisterInput): Promise<AuthSession> {
    // Fail generically on duplicates so sign-up cannot be used to enumerate accounts.
    const existing = await userRepo.findByEmail(input.email);
    if (existing) {
      throw new Error('Unable to create account');
    }

    // Store only the hash; role is hard-coded to INDIVIDUAL until verified otherwise.
    const password_hash = hashPassword(input.password);
    const user = await userRepo.create({
      email: input.email,
      password_hash,
      role: 'INDIVIDUAL',
      institution_id: input.institutionId ?? null,
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    return { token, user: toAuthUser(user) };
  },

  // Sign-in: verify the stored hash, then issue a fresh token.
  async authenticate(input: LoginInput): Promise<AuthSession> {
    // Unknown email, missing hash, and wrong password all raise the same message
    // so sign-in never reveals whether an account exists.
    const user = await userRepo.findByEmail(input.email);
    if (!user || !user.password_hash) {
      throw new Error('Invalid credentials');
    }

    const valid = comparePassword(input.password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    return { token, user: toAuthUser(user) };
  },

  // Resolve the caller's persisted record by id, null when it no longer exists.
  async getUserProfile(userId: string): Promise<AuthUser | null> {
    const user = await userRepo.findById(userId);
    return user ? toAuthUser(user) : null;
  },
};