import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import * as schema from './schema';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>;

let dbInstance: DrizzleDb;
let pgliteClient: PGlite | null = null;

if (process.env.NODE_ENV === 'test') {
  // In-memory real Postgres WASM engine for tests (Zero setup required!)
  pgliteClient = new PGlite();
  dbInstance = drizzlePglite(pgliteClient, { schema });
} else {
  // Live PostgreSQL for dev / production
  const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/chokro';
  const client = postgres(connectionString, { max: 5 });
  dbInstance = drizzle(client, { schema });
}

export const db = dbInstance;

export async function closeDb() {
  if (pgliteClient && typeof pgliteClient.close === 'function') {
    await pgliteClient.close();
  }
}

export { eq, and, or, lt, desc, asc, sql } from 'drizzle-orm';
export { alias } from 'drizzle-orm/pg-core';
export * from './schema';

