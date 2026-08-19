// Shared test helpers: bootstrap the DB schema, reset tables between tests,
// and mint users, tokens, headers, and route params for route tests.
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
    full_name varchar(120),
    phone varchar(30),
    student_id_doc text,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS campuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug varchar(255) NOT NULL UNIQUE,
    name varchar(255) NOT NULL,
    division varchar(50) NOT NULL,
    zilla varchar(120) NOT NULL,
    upazilla varchar(120),
    status varchar(50) NOT NULL DEFAULT 'VERIFIED',
    reason text,
    created_by uuid REFERENCES users(id),
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS partners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES users(id),
    org_name varchar(255) NOT NULL,
    types jsonb NOT NULL,
    e_waste_licensed boolean NOT NULL DEFAULT false,
    status varchar(50) NOT NULL DEFAULT 'APPLIED',
    doe_license_doc text,
    reason text,
    capability_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
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
    price_bdt decimal(10, 2) NOT NULL,
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
`CREATE TABLE IF NOT EXISTS conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES listings(id),
    buyer_id uuid NOT NULL REFERENCES users(id),
    seller_id uuid NOT NULL REFERENCES users(id),
    last_message_body text,
    last_message_at timestamp,
    created_at timestamp NOT NULL DEFAULT NOW(),
    UNIQUE (listing_id, buyer_id, seller_id)
  );`,
  `CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations(id),
    sender_id uuid NOT NULL REFERENCES users(id),
    body text NOT NULL,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS saved_listings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    listing_id uuid NOT NULL REFERENCES listings(id),
    created_at timestamp NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, listing_id)
  );`,
  `CREATE TABLE IF NOT EXISTS user_streaks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES users(id),
    current_streak_days integer NOT NULL DEFAULT 0,
    longest_streak_days integer NOT NULL DEFAULT 0,
    last_active_at timestamp,
    streak_multiplier decimal(4, 2) NOT NULL DEFAULT '1.00',
    leaderboard_opt_out boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS badge_awards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    badge_type varchar(50) NOT NULL,
    award_points decimal(10, 2) NOT NULL,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    awarded_at timestamp NOT NULL DEFAULT NOW(),
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS campus_leaderboards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    period varchar(20) NOT NULL,
    campus_id varchar(255) NOT NULL,
    total_points decimal(12, 2) NOT NULL DEFAULT '0',
    member_count integer NOT NULL DEFAULT 0,
    top_scorer_user_id uuid REFERENCES users(id),
    snapshot_date date NOT NULL,
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
TRUNCATE TABLE campus_leaderboards, badge_awards, user_streaks, credit_txns, saved_listings, messages, conversations, drop_zones, rate_card_entries, listings, partners, campuses, users CASCADE;
  `);
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
  return { params: Promise.resolve({ id }) };
}
