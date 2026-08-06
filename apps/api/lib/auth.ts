import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { RoleEnum, type Role } from '@chokro/shared';

const NON_PRODUCTION_JWT_SECRET = 'chokro-local-jwt-secret-2026';

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return NON_PRODUCTION_JWT_SECRET;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

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

type AuthResult =
  | { user: TokenPayload; response?: never }
  | { user?: never; response: NextResponse };

export function requireAuth(req: Request): AuthResult {
  const user = verifyAuthHeader(req);
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user };
}

export function requireAdmin(req: Request): AuthResult {
  const auth = requireAuth(req);
  if (auth.response) return auth;
  if (auth.user.role !== 'ADMIN') {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return auth;
}

export function verifyAuthHeader(req: Request): TokenPayload | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  return verifyToken(token);
}
