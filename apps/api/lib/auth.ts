// auth: password hashing, JWT signing/verification, and the request-level guards
// (requireAuth / requireAdmin) that protect API routes.
//
// JWT + BCrypt primitives, Next.js response helpers, and the shared role enum.
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { RoleEnum, type Role } from '@chokro/shared';

// Dev-only fallback; production must always supply JWT_SECRET via the environment.
const NON_PRODUCTION_JWT_SECRET = 'chokro-local-jwt-secret-2026';

// Resolve the signing secret, refusing to boot auth in production without one.
function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return NON_PRODUCTION_JWT_SECRET;
}

// Claims embedded in every issued token.
export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

// One-way BCrypt digest (cost 10) used before any credential is stored.
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

// Verify a candidate password against a stored hash.
export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// Mint a 7-day session token carrying the user's identity claims.
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

// Validate signature and expiry, then re-check claim shapes and the enumerated
// role; anything off yields null rather than throwing.
export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as Partial<TokenPayload>;
    const role = RoleEnum.safeParse(payload.role);
    if (typeof payload.userId !== 'string' || typeof payload.email !== 'string' || !role.success) {
      return null;
    }
    return { userId: payload.userId, email: payload.email, role: role.data };
  } catch {
    return null;
  }
}

// Guard outcome: either an authenticated user or a response to return early.
type AuthResult =
  | { user: TokenPayload; response?: never }
  | { user?: never; response: NextResponse };

// Route guard: short-circuits with 401 when no valid bearer token is presented.
export function requireAuth(req: Request): AuthResult {
  const user = verifyAuthHeader(req);
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user };
}

// Route guard layered on requireAuth that additionally demands the ADMIN role, else 403.
export function requireAdmin(req: Request): AuthResult {
  const auth = requireAuth(req);
  if (auth.response) return auth;
  if (auth.user.role !== 'ADMIN') {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return auth;
}

// Pull the Bearer token out of the Authorization header and verify it.
export function verifyAuthHeader(req: Request): TokenPayload | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  return verifyToken(token);
}

export const getAuthUser = verifyAuthHeader;

