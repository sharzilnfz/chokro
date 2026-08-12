import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import * as schema from './schema';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>;

let dbInstance: DrizzleDb;

if (process.env.NODE_ENV === 'test') {
  // In-memory real Postgres WASM engine for tests (Zero setup required!)
  const client = new PGlite();
  dbInstance = drizzlePglite(client, { schema });
} else {
  // Live PostgreSQL for dev / production
  const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/chokro';
  const client = postgres(connectionString, { max: 5 });
  dbInstance = drizzle(client, { schema });
}

export const db = dbInstance;
export { eq, and, or, lt, desc, sql } from 'drizzle-orm';
export * from './schema';
