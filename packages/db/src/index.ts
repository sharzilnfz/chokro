// DB package entry point: builds the Drizzle ORM client for PGlite (test) or Postgres (dev/prod).

// Drizzle ORM drivers and Postgres engine dependencies
import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import * as schema from './schema';

// Union of the two possible Drizzle handles (in-memory PGlite vs live Postgres)
type DrizzleDb = ReturnType<typeof drizzle<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>;

// Module-level client state resolved once at import time
let dbInstance: DrizzleDb;
let pgliteClient: PGlite | null = null;

import { execSync } from 'child_process';

function resolveConnectionString(): string {
  let url = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/chokro';
  if (process.platform === 'win32' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    try {
      const output = execSync('wsl ip -4 addr show eth0', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 1500 });
      const match = output.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
      if (match && match[1]) {
        url = url.replace('localhost', match[1]).replace('127.0.0.1', match[1]);
      }
    } catch {
      // WSL not present or error, keep standard URL
    }
  }
  return url;
}

// Pick the DB backend based on the runtime environment
if (process.env.NODE_ENV === 'test') {
  // In-memory real Postgres WASM engine for tests (Zero setup required!)
  pgliteClient = new PGlite();
  dbInstance = drizzlePglite(pgliteClient, { schema });
} else {
  // Live PostgreSQL for dev / production
  const connectionString = resolveConnectionString();
  const client = postgres(connectionString, { max: 5 });
  dbInstance = drizzle(client, { schema });
}

// Single shared client used for all queries
export const db = dbInstance;

// Close the in-memory engine when the owning process finishes
export async function closeDb() {
  if (pgliteClient && typeof pgliteClient.close === 'function') {
    await pgliteClient.close();
  }
}

// Re-export Drizzle query helpers and the schema for consumer convenience
export { eq, and, or, lt, desc, sql, gte, lte, gt, inArray, asc } from 'drizzle-orm';
export * from './schema';
