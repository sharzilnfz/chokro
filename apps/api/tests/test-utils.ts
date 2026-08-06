import crypto from 'crypto';
import { memoryStore, resetMemoryStore } from '@chokro/db';
import type { Role } from '@chokro/shared';
import { hashPassword, signToken } from '../lib/auth';

export function resetTestStore() {
  resetMemoryStore();
}

export function createTestUser(role: Role = 'INDIVIDUAL', email = `${crypto.randomUUID()}@test.chokro.org`) {
  const user = {
    id: crypto.randomUUID(),
    email,
    password_hash: hashPassword('password123'),
    role,
    institution_id: null,
    created_at: new Date(),
  };
  memoryStore.users.push(user);
  return user;
}

export function tokenFor(user: ReturnType<typeof createTestUser>) {
  return signToken({ userId: user.id, email: user.email, role: user.role });
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}
