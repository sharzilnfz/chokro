// Shared test helpers: bootstrap the DB schema, reset tables between tests,
// and mint users, tokens, headers, and route params for route tests.
import crypto from 'crypto';
import { db, users, sql } from '@chokro/db';
import { getTableDDLs, getTruncateOrder } from '@chokro/db/src/ddl';
import type { Role } from '@chokro/shared';
import { hashPassword, signToken } from '../lib/auth';

let schemaInitialized = false;

export async function ensureTestDbSchema() {
  if (!schemaInitialized) {
    // Skip when the schema is already present (mirrors the old IF NOT EXISTS semantics).
    const res: unknown = await db.execute(sql`SELECT to_regclass('public.users') AS reg`);
    const rows: { reg: string | null }[] = Array.isArray(res) ? res : (res as { rows: { reg: string | null }[] }).rows;
    if (rows[0]?.reg == null) {
      for (const ddl of await getTableDDLs()) {
        await db.execute(sql.raw(ddl));
      }
    }
    schemaInitialized = true;
  }
}

export async function resetTestStore() {
  await ensureTestDbSchema();
  await db.execute(
    sql.raw(`TRUNCATE TABLE ${getTruncateOrder().join(', ')} CASCADE;`)
  );
}

export async function createTestUser(
  role: Role = 'INDIVIDUAL',
  email = `${crypto.randomUUID()}@test.chokro.org`,
  institutionId?: string | null
) {
  await ensureTestDbSchema();
  const user = {
    id: crypto.randomUUID(),
    email,
    password_hash: hashPassword('password123'),
    role,
    institution_id: institutionId || null,
  };
  const rows = await db.insert(users).values(user).returning();
  return rows[0] as { id: string; email: string; role: Role; institution_id: string | null };
}

export function tokenFor(user: { id: string; email: string; role: Role }) {
  return signToken({ userId: user.id, email: user.email, role: user.role });
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export function routeParams(id: string) {
  return { params: Promise.resolve({ id, ref: id }) };
}
