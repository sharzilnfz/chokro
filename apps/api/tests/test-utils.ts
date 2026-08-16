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
    vehicle_label varchar(60),
    vehicle_capacity_kg decimal(10, 2),
    base_lat double precision,
    base_lng double precision,
    service_radius_km integer DEFAULT 10,
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
    source varchar(100) NOT NULL DEFAULT 'Metals-API / Commodity Index Feed',
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
  `CREATE TABLE IF NOT EXISTS pickup_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES listings(id),
    customer_id uuid NOT NULL REFERENCES users(id),
    collector_partner_id uuid REFERENCES partners(id),
    status varchar(50) NOT NULL DEFAULT 'REQUESTED',
    address text NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    scheduled_for timestamp NOT NULL,
    notes text,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS dispatch_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES pickup_orders(id),
    collector_partner_id uuid NOT NULL REFERENCES partners(id),
    stop_sequence integer NOT NULL,
    distance_km decimal(10, 2),
    eta_minutes integer,
    assigned_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS auction_lots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar(120) NOT NULL,
    description text,
    category varchar(50) NOT NULL,
    quantity_kg decimal(10, 2) NOT NULL,
    starting_price_bdt decimal(12, 2) NOT NULL,
    reserve_price_bdt decimal(12, 2) NOT NULL,
    origin_label varchar(160),
    status varchar(30) NOT NULL DEFAULT 'DRAFT',
    opens_at timestamp NOT NULL,
    closes_at timestamp NOT NULL,
    winning_bid_id uuid,
    created_by uuid NOT NULL REFERENCES users(id),
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS auction_bids (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id uuid NOT NULL REFERENCES auction_lots(id),
    bidder_user_id uuid NOT NULL REFERENCES users(id),
    amount_bdt decimal(12, 2) NOT NULL,
    bid_number integer NOT NULL,
    received_at timestamp NOT NULL DEFAULT NOW()
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
    TRUNCATE TABLE auction_bids, auction_lots, dispatch_assignments, pickup_orders, valuation_scans, rate_benchmarks, credit_txns, drop_zones, rate_card_entries, listings, partners, users CASCADE;
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
