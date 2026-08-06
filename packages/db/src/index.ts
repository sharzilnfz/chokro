import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';
dotenv.config({ quiet: true });

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/chokro';

// In-memory store for unit test fallback when live PostgreSQL is unavailable
export const memoryStore = {
  users: [] as any[],
  partners: [] as any[],
  listings: [] as any[],
  rateCardEntries: [] as any[],
  dropZones: [] as any[],
  creditTxns: [] as any[],
};

let client: ReturnType<typeof postgres> | null = null;
if (process.env.NODE_ENV !== 'test') {
  client = postgres(connectionString, { max: 5, connect_timeout: 2, idle_timeout: 20 });
}

export const db = client ? drizzle(client, { schema }) : (null as any);

export function resetMemoryStore() {
  for (const records of Object.values(memoryStore)) {
    records.splice(0, records.length);
  }
}

export * from './schema';
