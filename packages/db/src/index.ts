import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/chokro';

// For migrations & queries
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export * from './schema';
