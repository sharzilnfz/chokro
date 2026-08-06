import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';
dotenv.config();

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

let client: any;
try {
  client = postgres(connectionString, { max: 1, connect_timeout: 2, idle_timeout: 1 });
} catch (err) {
  client = null;
}

export const db = client ? drizzle(client, { schema }) : (null as any);
export * from './schema';
