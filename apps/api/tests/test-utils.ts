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
    vehicle_label varchar(60),
    vehicle_capacity_kg decimal(10, 2),
    base_lat double precision,
    base_lng double precision,
    service_radius_km integer DEFAULT 10,
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
    max_capacity_kg decimal(10, 2) DEFAULT 50.00,
    current_fill_kg decimal(10, 2) NOT NULL DEFAULT 0.00,
    last_emptied_at timestamp,
    contracted_partner_id uuid REFERENCES partners(id),
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS zone_capacity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id uuid NOT NULL REFERENCES drop_zones(id),
    recorded_fill_kg decimal(10, 2) NOT NULL,
    capacity_percentage integer NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'NORMAL',
    trigger_reason varchar(60) NOT NULL,
    logged_at timestamp NOT NULL DEFAULT NOW()
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
  `CREATE TABLE IF NOT EXISTS pickup_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid REFERENCES listings(id),
    customer_id uuid REFERENCES users(id),
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
    received_at timestamp NOT NULL DEFAULT NOW(),
    UNIQUE (lot_id, bid_number)
  );`,
  `CREATE TABLE IF NOT EXISTS evidence_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id uuid REFERENCES users(id),
    storage_path text NOT NULL,
    url text NOT NULL,
    mime_type varchar(50) NOT NULL,
    byte_size integer NOT NULL,
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
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS kyc_extractions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid NOT NULL REFERENCES partners(id),
    document_url text NOT NULL,
    document_type varchar(50) NOT NULL,
    ocr_provider varchar(50) NOT NULL DEFAULT 'GOOGLE_VISION',
    raw_extracted_text text,
    extracted_org_name varchar(255),
    extracted_license_number varchar(100),
    extracted_expiry_date timestamp,
    confidence_score decimal(4, 2) NOT NULL,
    match_status varchar(50) NOT NULL DEFAULT 'PENDING_MATCH',
    mismatched_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_expired boolean NOT NULL DEFAULT false,
    adjudicated_by uuid REFERENCES users(id),
    adjudicated_at timestamp,
    adjudication_notes text,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS partner_compliance_audits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid NOT NULL REFERENCES partners(id),
    extraction_id uuid REFERENCES kyc_extractions(id),
    previous_status varchar(50) NOT NULL,
    new_status varchar(50) NOT NULL,
    granted_capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
    actor_id uuid NOT NULL REFERENCES users(id),
    reason text NOT NULL,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS listing_media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid REFERENCES listings(id),
    uploader_id uuid NOT NULL REFERENCES users(id),
    storage_provider varchar(50) NOT NULL DEFAULT 'CLOUDINARY',
    public_url text NOT NULL,
    thumbnail_url text NOT NULL,
    original_filename varchar(255) NOT NULL,
    mime_type varchar(50) NOT NULL,
    byte_size integer NOT NULL,
    width integer,
    height integer,
    exif_gps_extracted boolean NOT NULL DEFAULT false,
    extracted_lat double precision,
    extracted_lng double precision,
    is_privacy_stripped boolean NOT NULL DEFAULT true,
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
    TRUNCATE TABLE listing_media, partner_compliance_audits, kyc_extractions, zone_capacity_logs, campus_leaderboards, badge_awards, user_streaks, saved_listings, messages, conversations, evidence_records, auction_bids, auction_lots, dispatch_assignments, pickup_orders, valuation_scans, rate_benchmarks, credit_txns, drop_zones, rate_card_entries, listings, partners, campuses, users CASCADE;
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
