import crypto from 'crypto';
import { db, users, sql } from '@chokro/db';
import type { Role } from '@chokro/shared';
import { hashPassword, signToken } from '../lib/auth';

const TABLE_DDLS = [
  `CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(255) NOT NULL UNIQUE,
    password_hash text NOT NULL,
    role varchar(50) NOT NULL DEFAULT 'INDIVIDUAL',
    institution_id varchar(255),
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS partners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    org_name varchar(255) NOT NULL,
    types jsonb NOT NULL,
    e_waste_licensed boolean NOT NULL DEFAULT false,
    status varchar(50) NOT NULL DEFAULT 'APPLIED',
    doe_license_doc text,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS listings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES users(id),
    category varchar(50) NOT NULL,
    unit varchar(20) NOT NULL,
    declared_weight decimal(10, 2),
    piece_count integer,
    declared_condition varchar(50) NOT NULL,
    photos jsonb NOT NULL DEFAULT '[]'::jsonb,
    status varchar(50) NOT NULL DEFAULT 'ACTIVE',
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS rate_card_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category varchar(50) NOT NULL,
    condition_band varchar(50) NOT NULL,
    unit varchar(20) NOT NULL,
    price_bdt decimal(10, 2) NOT NULL,
    effective_from timestamp NOT NULL DEFAULT NOW(),
    updated_by uuid REFERENCES users(id)
  );`,
  `CREATE TABLE IF NOT EXISTS drop_zones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id varchar(255) NOT NULL,
    name varchar(255) NOT NULL,
    geo_location jsonb,
    qr_token text NOT NULL UNIQUE,
    accepted_categories jsonb NOT NULL,
    status varchar(50) NOT NULL DEFAULT 'ACTIVE',
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS credit_txns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    amount decimal(10, 2) NOT NULL,
    kind varchar(50) NOT NULL,
    status varchar(50) NOT NULL DEFAULT 'PENDING',
    source_id varchar(255),
    reason text,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS rate_benchmarks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category varchar(50) NOT NULL UNIQUE,
    commodity_symbol varchar(50) NOT NULL,
    global_price_usd decimal(10, 2) NOT NULL,
    fx_rate_usd_bdt decimal(10, 2) NOT NULL DEFAULT 122.50,
    benchmark_bdt decimal(10, 2) NOT NULL,
    source varchar(100) NOT NULL DEFAULT 'Open Benchmark / Global Commodity Feed',
    updated_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS valuation_scans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id),
    image_url text,
    detected_category varchar(50) NOT NULL,
    detected_condition varchar(50) NOT NULL,
    estimated_quantity decimal(10, 2) NOT NULL,
    unit varchar(20) NOT NULL,
    next_life_path varchar(50) NOT NULL,
    is_ewaste_hazard boolean NOT NULL DEFAULT false,
    confidence decimal(4, 2) NOT NULL,
    estimated_value_bdt decimal(10, 2) NOT NULL,
    reasoning_rationale text NOT NULL,
    suggested_action text,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
];

let schemaInitialized = false;

export async function ensureTestDbSchema() {
  if (!schemaInitialized) {
    for (const ddl of TABLE_DDLS) {
      await db.execute(sql.raw(ddl));
    }
    schemaInitialized = true;
  }
}

export async function resetTestStore() {
  await ensureTestDbSchema();
  await db.execute(sql`
    TRUNCATE TABLE valuation_scans, rate_benchmarks, credit_txns, drop_zones, rate_card_entries, listings, partners, users CASCADE;
  `);
}

export async function createTestUser(role: Role = 'INDIVIDUAL', email = `${crypto.randomUUID()}@test.chokro.org`) {
  await ensureTestDbSchema();
  const user = {
    id: crypto.randomUUID(),
    email,
    password_hash: hashPassword('password123'),
    role,
    institution_id: null,
  };
  const rows = await db.insert(users).values(user).returning();
  return rows[0] as { id: string; email: string; role: Role };
}

export function tokenFor(user: { id: string; email: string; role: Role }) {
  return signToken({ userId: user.id, email: user.email, role: user.role });
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}
