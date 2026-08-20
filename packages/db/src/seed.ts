// Seeds local development data: demo accounts per role, partner orgs, baseline rates, commodity benchmarks, pickup routes, auction lots, drop zones, verified deposits, trust decisions, bilateral negotiations, reverse demands, KYC extractions, institutional ESG certificates, and campus leaderboards.
import {
  db,
  users,
  campuses,
  partners,
  listings,
  listingMedia,
  rateCardEntries,
  rateBenchmarks,
  dropZones,
  zoneCapacityLogs,
  zoneEmptyingRecords,
  dropSessions,
  depositRecords,
  pickupOrders,
  dispatchAssignments,
  custodyHandovers,
  auctionLots,
  auctionBids,
  escrowHolds,
  buyerDemands,
  demandMatches,
  negotiationThreads,
  negotiationOffers,
  conversations,
  messages,
  savedListings,
  valuationScans,
  trustThresholdConfigs,
  trustDecisions,
  fraudFlags,
  evidenceHashes,
  decisionContests,
  creditTxns,
  liabilityCaps,
  redemptionRequests,
  payoutRecords,
  disputes,
  emissionFactors,
  impactRecords,
  institutionAccounts,
  sustainabilityCertificates,
  sponsorshipPools,
  evidenceRecords,
  userStreaks,
  badgeAwards,
  campusLeaderboards,
  partnerComplianceAudits,
  kycExtractions,
  sql,
} from './index';
import { and, eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import crypto from 'crypto';

// Local demo accounts only. Never reuse this password outside local development.
const DEMO_PASSWORD = 'password123';

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
    lat double precision,
    lng double precision,
    thana varchar(120),
    zilla varchar(120),
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
    custody_ref varchar(255) UNIQUE,
    rate_card_entry_id uuid REFERENCES rate_card_entries(id),
    trust_decision_id uuid,
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
    source_type varchar(30) NOT NULL DEFAULT 'LISTING',
    zone_id uuid REFERENCES drop_zones(id),
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
  `CREATE TABLE IF NOT EXISTS buyer_demands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id uuid NOT NULL REFERENCES users(id),
    category varchar(50) NOT NULL,
    min_quantity decimal(10, 2) NOT NULL,
    max_quantity decimal(10, 2),
    unit varchar(20) NOT NULL,
    max_price_per_unit_bdt decimal(10, 2) NOT NULL,
    target_thana varchar(120),
    target_lat double precision,
    target_lng double precision,
    max_radius_km integer NOT NULL DEFAULT 10,
    status varchar(30) NOT NULL DEFAULT 'ACTIVE',
    expires_at timestamp NOT NULL,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS demand_matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_id uuid NOT NULL REFERENCES buyer_demands(id),
    listing_id uuid NOT NULL REFERENCES listings(id),
    match_score decimal(4, 2) NOT NULL,
    distance_km decimal(10, 2),
    notification_sent boolean NOT NULL DEFAULT false,
    status varchar(30) NOT NULL DEFAULT 'UNNOTICED',
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS drop_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id uuid NOT NULL REFERENCES drop_zones(id),
    user_id uuid NOT NULL REFERENCES users(id),
    session_secret varchar(255) NOT NULL,
    short_code varchar(20) NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'OPEN',
    expires_at timestamp NOT NULL,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS deposit_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES drop_sessions(id),
    zone_id uuid NOT NULL REFERENCES drop_zones(id),
    user_id uuid NOT NULL REFERENCES users(id),
    category varchar(50) NOT NULL,
    unit varchar(20) NOT NULL,
    declared_quantity decimal(10, 2) NOT NULL,
    verified_quantity decimal(10, 2),
    evidence_url text NOT NULL,
    rate_card_entry_id uuid REFERENCES rate_card_entries(id),
    estimated_bdt decimal(10, 2) NOT NULL,
    verified_bdt decimal(10, 2),
    status varchar(30) NOT NULL DEFAULT 'RECORDED',
    divergence_ratio decimal(6, 3),
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS zone_emptying_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id uuid NOT NULL REFERENCES drop_zones(id),
    collector_partner_id uuid REFERENCES partners(id),
    scale_readings_json jsonb NOT NULL,
    evidence_url text,
    total_mass_kg decimal(10, 2) NOT NULL,
    emptied_at timestamp NOT NULL DEFAULT NOW(),
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS trust_threshold_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_json jsonb NOT NULL,
    effective_from timestamp NOT NULL DEFAULT NOW(),
    updated_by uuid REFERENCES users(id),
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS trust_decisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type varchar(50) NOT NULL,
    subject_id uuid NOT NULL,
    decision varchar(30) NOT NULL,
    failing_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
    evaluated_signals jsonb NOT NULL,
    threshold_config_id uuid,
    decided_by varchar(50) NOT NULL DEFAULT 'SYSTEM',
    decided_at timestamp NOT NULL DEFAULT NOW(),
    notes text,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS fraud_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type varchar(50) NOT NULL,
    entity_id uuid NOT NULL,
    flag_type varchar(50) NOT NULL,
    reason text NOT NULL,
    severity varchar(20) NOT NULL DEFAULT 'MEDIUM',
    is_cleared boolean NOT NULL DEFAULT false,
    cleared_by uuid REFERENCES users(id),
    cleared_at timestamp,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS evidence_hashes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_url text NOT NULL,
    phash_hex varchar(64) NOT NULL,
    uploader_id uuid NOT NULL REFERENCES users(id),
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS negotiation_threads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES listings(id),
    buyer_id uuid NOT NULL REFERENCES users(id),
    seller_id uuid NOT NULL REFERENCES users(id),
    status varchar(30) NOT NULL DEFAULT 'OPEN',
    last_offer_id uuid,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS negotiation_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id uuid NOT NULL REFERENCES negotiation_threads(id),
    offered_by_user_id uuid NOT NULL REFERENCES users(id),
    offer_amount_bdt decimal(10, 2) NOT NULL,
    offered_quantity decimal(10, 2) NOT NULL,
    unit varchar(20) NOT NULL,
    proposed_pickup_at timestamp,
    notes text,
    status varchar(30) NOT NULL DEFAULT 'PENDING',
    expires_at timestamp NOT NULL,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS custody_handovers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES pickup_orders(id),
    otp_code_hash varchar(255) NOT NULL,
    giver_user_id uuid NOT NULL REFERENCES users(id),
    collector_partner_id uuid NOT NULL REFERENCES partners(id),
    status varchar(30) NOT NULL DEFAULT 'PENDING',
    expires_at timestamp NOT NULL,
    confirmed_at timestamp,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS decision_contests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id uuid NOT NULL REFERENCES trust_decisions(id),
    user_id uuid NOT NULL REFERENCES users(id),
    reason text NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'PENDING',
    reviewed_by uuid REFERENCES users(id),
    reviewed_at timestamp,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS liability_caps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    monthly_platform_cap_bdt decimal(12, 2) NOT NULL,
    monthly_user_cap_bdt decimal(10, 2) NOT NULL,
    min_redemption_bdt decimal(10, 2) NOT NULL,
    fee_percentage decimal(5, 2) NOT NULL,
    effective_from timestamp NOT NULL DEFAULT NOW(),
    updated_by uuid REFERENCES users(id),
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS redemption_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    amount_credits decimal(10, 2) NOT NULL,
    payout_channel varchar(30) NOT NULL,
    account_number varchar(50) NOT NULL,
    gross_amount_bdt decimal(10, 2) NOT NULL,
    fee_bdt decimal(10, 2) NOT NULL,
    net_amount_bdt decimal(10, 2) NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'REQUESTED',
    trust_decision_id uuid REFERENCES trust_decisions(id),
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS payout_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    redemption_id uuid NOT NULL REFERENCES redemption_requests(id),
    gateway_ref varchar(100),
    gateway_provider varchar(50) NOT NULL DEFAULT 'SSLCOMMERZ_MFS',
    status varchar(30) NOT NULL,
    payload jsonb,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS escrow_holds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id uuid NOT NULL REFERENCES auction_lots(id),
    buyer_id uuid NOT NULL REFERENCES users(id),
    seller_id uuid NOT NULL REFERENCES users(id),
    amount_bdt decimal(10, 2) NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'HELD',
    inspection_expires_at timestamp NOT NULL,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS disputes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type varchar(50) NOT NULL,
    source_id uuid NOT NULL,
    opened_by uuid NOT NULL REFERENCES users(id),
    against_user_id uuid NOT NULL REFERENCES users(id),
    reason text NOT NULL,
    evidence_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
    status varchar(30) NOT NULL DEFAULT 'OPEN',
    resolution varchar(50),
    resolution_notes text,
    resolved_by uuid REFERENCES users(id),
    resolved_at timestamp,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS impact_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    custody_type varchar(50) NOT NULL,
    custody_id varchar(255) NOT NULL UNIQUE,
    trust_decision_id uuid NOT NULL REFERENCES trust_decisions(id),
    user_id uuid NOT NULL REFERENCES users(id),
    institution_id uuid REFERENCES campuses(id),
    category varchar(50) NOT NULL,
    next_life_path varchar(50) NOT NULL,
    mass_kg decimal(10, 2) NOT NULL,
    avoided_co2e_kg decimal(10, 3) NOT NULL,
    factor_version varchar(20) NOT NULL,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS emission_factors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category varchar(50) NOT NULL,
    next_life_path varchar(50) NOT NULL,
    factor_co2e_per_kg decimal(10, 4) NOT NULL,
    range_low decimal(10, 4) NOT NULL,
    range_high decimal(10, 4) NOT NULL,
    source varchar(100) NOT NULL,
    version varchar(20) NOT NULL,
    effective_from timestamp NOT NULL DEFAULT NOW(),
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS institution_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id uuid NOT NULL REFERENCES campuses(id),
    invite_code varchar(50) NOT NULL,
    contact_email varchar(100) NOT NULL,
    total_diverted_kg decimal(12, 2) NOT NULL DEFAULT '0',
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS sustainability_certificates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL REFERENCES campuses(id),
    certificate_ref varchar(100) NOT NULL UNIQUE,
    period_start timestamp NOT NULL,
    period_end timestamp NOT NULL,
    total_mass_kg decimal(12, 2) NOT NULL,
    total_co2e_kg decimal(12, 3) NOT NULL,
    covered_record_ids jsonb NOT NULL,
    signature_hash varchar(100) NOT NULL,
    issued_at timestamp NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS sponsorship_pools (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL REFERENCES campuses(id),
    total_budget_bdt decimal(12, 2) NOT NULL,
    remaining_budget_bdt decimal(12, 2) NOT NULL,
    monthly_draw_cap_bdt decimal(12, 2) NOT NULL,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`,
];

async function ensureSchema() {
  for (const ddl of TABLE_DDLS) {
    await db.execute(sql.raw(ddl));
  }
}

// Idempotent user insert-or-update keyed by email
async function upsertUser(
  email: string,
  role: 'INDIVIDUAL' | 'PARTNER' | 'ADMIN',
  passwordHash: string,
  institutionId?: string | null,
  profile?: { fullName?: string; phone?: string; studentIdDoc?: string }
) {
  const [user] = await db
    .insert(users)
    .values({
      email,
      password_hash: passwordHash,
      role,
      institution_id: institutionId || null,
      full_name: profile?.fullName,
      phone: profile?.phone,
      student_id_doc: profile?.studentIdDoc,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        password_hash: passwordHash,
        role,
        ...(institutionId !== undefined ? { institution_id: institutionId } : {}),
        ...(profile?.fullName ? { full_name: profile.fullName } : {}),
        ...(profile?.phone ? { phone: profile.phone } : {}),
        ...(profile?.studentIdDoc ? { student_id_doc: profile.studentIdDoc } : {}),
      },
    })
    .returning();
  return user;
}

// Idempotent campus insert keyed on slug
async function upsertCampus(input: {
  slug: string;
  name: string;
  division: string;
  zilla: string;
  upazilla?: string | null;
  status?: string;
}) {
  const [existing] = await db.select().from(campuses).where(eq(campuses.slug, input.slug)).limit(1);
  if (existing) {
    const [updated] = await db
      .update(campuses)
      .set({
        name: input.name,
        division: input.division,
        zilla: input.zilla,
        upazilla: input.upazilla || null,
        status: input.status || 'VERIFIED',
      })
      .where(eq(campuses.id, existing.id))
      .returning();
    return updated;
  }
  const [inserted] = await db
    .insert(campuses)
    .values({
      slug: input.slug,
      name: input.name,
      division: input.division,
      zilla: input.zilla,
      upazilla: input.upazilla || null,
      status: input.status || 'VERIFIED',
    })
    .returning();
  return inserted;
}

type AuctionBidSpec = { bidderUserId: string; amount: string; minutesAgo: number };

async function ensureAuctionLot(spec: {
  lot: typeof auctionLots.$inferInsert;
  bids: AuctionBidSpec[];
  refreshWindow?: { opensMinutesAgo: number; closesMinutesFromNow: number };
  winningBid?: boolean;
}) {
  const [existing] = await db
    .select()
    .from(auctionLots)
    .where(and(eq(auctionLots.created_by, spec.lot.created_by), eq(auctionLots.title, spec.lot.title)))
    .limit(1);

  if (existing) {
    if (spec.refreshWindow) {
      await db
        .update(auctionLots)
        .set({
          opens_at: new Date(Date.now() - spec.refreshWindow.opensMinutesAgo * 60_000),
          closes_at: new Date(Date.now() + spec.refreshWindow.closesMinutesFromNow * 60_000),
          status: spec.lot.status,
          updated_at: new Date(),
        })
        .where(eq(auctionLots.id, existing.id));

      for (const bid of await db.select().from(auctionBids).where(eq(auctionBids.lot_id, existing.id))) {
        const match = spec.bids[Math.min(bid.bid_number, spec.bids.length) - 1];
        if (match) {
          await db
            .update(auctionBids)
            .set({ received_at: new Date(Date.now() - match.minutesAgo * 60_000) })
            .where(eq(auctionBids.id, bid.id));
        }
      }
    }
    return existing;
  }

  const [lot] = await db.insert(auctionLots).values(spec.lot).returning();
  const insertedBids: Array<typeof auctionBids.$inferSelect> = [];
  for (let i = 0; i < spec.bids.length; i++) {
    const bid = spec.bids[i];
    const [inserted] = await db
      .insert(auctionBids)
      .values({
        lot_id: lot.id,
        bidder_user_id: bid.bidderUserId,
        amount_bdt: bid.amount,
        bid_number: i + 1,
        received_at: new Date(Date.now() - bid.minutesAgo * 60_000),
      })
      .returning();
    insertedBids.push(inserted);
  }
  if (spec.winningBid && insertedBids.length > 0) {
    const winner = insertedBids[insertedBids.length - 1];
    await db.update(auctionLots).set({ winning_bid_id: winner.id }).where(eq(auctionLots.id, lot.id));
  }
  return lot;
}

async function seed() {
  console.log('Seeding Chokro database with dynamic 7-scenario mid-lifecycle matrix...');
  const passwordHash = await hash(DEMO_PASSWORD, 10);

  // Ensure all schema tables exist in the current db backend
  await ensureSchema();

  // =========================================================================
  // 1. CAMPUSES & INSTITUTION ACCOUNTS
  // =========================================================================
  const bracuCampus = await upsertCampus({
    slug: 'BRACU',
    name: 'BRAC University',
    division: 'DHAKA',
    zilla: 'Dhaka',
    upazilla: 'Merul Badda',
    status: 'VERIFIED',
  });
  const duCampus = await upsertCampus({
    slug: 'DU',
    name: 'University of Dhaka',
    division: 'DHAKA',
    zilla: 'Dhaka',
    upazilla: 'Shahbag',
    status: 'VERIFIED',
  });
  const buetCampus = await upsertCampus({
    slug: 'BUET',
    name: 'Bangladesh University of Engineering and Technology',
    division: 'DHAKA',
    zilla: 'Dhaka',
    upazilla: 'Palashi',
    status: 'VERIFIED',
  });
  const nsuCampus = await upsertCampus({
    slug: 'NSU',
    name: 'North South University',
    division: 'DHAKA',
    zilla: 'Dhaka',
    upazilla: 'Bashundhara R/A',
    status: 'VERIFIED',
  });

  // =========================================================================
  // 2. USERS (Roles: ADMIN, INDIVIDUAL, PARTNER)
  // =========================================================================
  const adminOrgUser = await upsertUser('admin@chokro.org', 'ADMIN', passwordHash, 'NSU', {
    fullName: 'Platform Administrator',
    phone: '+8801700000001',
  });
  await upsertUser('admin@chokro.com', 'ADMIN', passwordHash, 'NSU', {
    fullName: 'Super Admin',
    phone: '+8801700000000',
  });
  const student1User = await upsertUser('student1@bracu.ac.bd', 'INDIVIDUAL', passwordHash, 'BRACU', {
    fullName: 'Tanvir Hossain',
    phone: '+8801711111112',
    studentIdDoc: 'BRACU-2023-ST-8812.pdf',
  });
  const student2User = await upsertUser('student2@du.ac.bd', 'INDIVIDUAL', passwordHash, 'DU', {
    fullName: 'Sadia Rahman',
    phone: '+8801722222222',
    studentIdDoc: 'DU-2024-ST-4419.pdf',
  });
  const normalUser = await upsertUser('user@chokro.org', 'INDIVIDUAL', passwordHash, 'BRACU', {
    fullName: 'Demo Student',
    phone: '+8801711111111',
  });
  const partnerUser = await upsertUser('partner@chokro.org', 'PARTNER', passwordHash, 'DU', {
    fullName: 'BanglaBin Recycling',
    phone: '+8801733333333',
  });
  const collectorKorimUser = await upsertUser('collector_korim@bengalrecycle.com', 'PARTNER', passwordHash, 'BRACU', {
    fullName: 'Korim Ahmed',
    phone: '+8801733333334',
  });
  const collector1User = await upsertUser('collector1@chokro.org', 'PARTNER', passwordHash, null, {
    fullName: 'Dhanmondi Eco Fleet',
    phone: '+8801766666666',
  });
  const collector2User = await upsertUser('collector2@chokro.org', 'PARTNER', passwordHash, null, {
    fullName: 'Savar Trike Fleet',
    phone: '+8801777777777',
  });
  const recyclerRahimUser = await upsertUser('recycler_rahim@dhakascrap.com', 'PARTNER', passwordHash, null, {
    fullName: 'Rahim Khan',
    phone: '+8801744444444',
  });
  const recycler1User = await upsertUser('recycler1@chokro.org', 'PARTNER', passwordHash, null, {
    fullName: 'Dhaka Steel Recyclers',
    phone: '+8801755555551',
  });
  const recycler2User = await upsertUser('recycler2@chokro.org', 'PARTNER', passwordHash, null, {
    fullName: 'Narayanganj Metal Works',
    phone: '+8801788888888',
  });
  const buyerFarukUser = await upsertUser('buyer_faruk@metals.com', 'INDIVIDUAL', passwordHash, null, {
    fullName: 'Faruk Metals',
    phone: '+8801755555555',
  });
  const electrofixUser = await upsertUser('electrofix@chokro.org', 'PARTNER', passwordHash, null, {
    fullName: 'ElectroFix Workshop',
    phone: '+8801799999999',
  });
  const applicantPartnerUser = await upsertUser('applicant_partner@bengalrecycle.com', 'PARTNER', passwordHash, null, {
    fullName: 'Bengal Recyclers Applicant',
    phone: '+8801811111111',
  });

  // =========================================================================
  // 3. PARTNERS & FLEETS
  // =========================================================================
  async function upsertPartnerRecord(spec: {
    userId: string;
    orgName: string;
    types: string[];
    eWasteLicensed: boolean;
    doeLicenseDoc?: string | null;
    status: string;
    vehicleLabel?: string;
    vehicleCapacityKg?: string;
    baseLat?: number;
    baseLng?: number;
    serviceRadiusKm?: number;
    capabilityFlags?: Record<string, boolean>;
  }) {
    const [existing] = await db.select().from(partners).where(eq(partners.user_id, spec.userId)).limit(1);
    if (existing) {
      const [updated] = await db
        .update(partners)
        .set({
          org_name: spec.orgName,
          types: spec.types,
          e_waste_licensed: spec.eWasteLicensed,
          doe_license_doc: spec.doeLicenseDoc || null,
          status: spec.status,
          vehicle_label: spec.vehicleLabel,
          vehicle_capacity_kg: spec.vehicleCapacityKg,
          base_lat: spec.baseLat,
          base_lng: spec.baseLng,
          service_radius_km: spec.serviceRadiusKm,
          capability_flags: spec.capabilityFlags || {},
        })
        .where(eq(partners.id, existing.id))
        .returning();
      return updated;
    }
    const [inserted] = await db
      .insert(partners)
      .values({
        user_id: spec.userId,
        org_name: spec.orgName,
        types: spec.types,
        e_waste_licensed: spec.eWasteLicensed,
        doe_license_doc: spec.doeLicenseDoc || null,
        status: spec.status,
        vehicle_label: spec.vehicleLabel,
        vehicle_capacity_kg: spec.vehicleCapacityKg,
        base_lat: spec.baseLat,
        base_lng: spec.baseLng,
        service_radius_km: spec.serviceRadiusKm,
        capability_flags: spec.capabilityFlags || {},
      })
      .returning();
    return inserted;
  }

  await upsertPartnerRecord({
    userId: partnerUser.id,
    orgName: 'BanglaBin Recycling Ltd',
    types: ['RECYCLER', 'COLLECTOR'],
    eWasteLicensed: true,
    doeLicenseDoc: 'DOE-LICENSE-2026-9912.pdf',
    status: 'VERIFIED',
    vehicleLabel: 'Collection Van',
    vehicleCapacityKg: '800.00',
    baseLat: 23.7700,
    baseLng: 90.4100,
    serviceRadiusKm: 15,
    capabilityFlags: { collects: true, repairs: false, buys: true, accepts_donations: true },
  });

  const partnerBengalCollector = await upsertPartnerRecord({
    userId: collectorKorimUser.id,
    orgName: 'Bengal Circular Logistics',
    types: ['COLLECTOR'],
    eWasteLicensed: true,
    doeLicenseDoc: 'DOE-LICENSE-2026-9912.pdf',
    status: 'VERIFIED',
    vehicleLabel: '800kg Van',
    vehicleCapacityKg: '800.00',
    baseLat: 23.7806,
    baseLng: 90.4192,
    serviceRadiusKm: 12,
    capabilityFlags: { collects: true, repairs: false, buys: true, accepts_donations: true },
  });

  const partnerDhakaRecycler = await upsertPartnerRecord({
    userId: recyclerRahimUser.id,
    orgName: 'Dhaka Green Recyclers',
    types: ['RECYCLER', 'COLLECTOR'],
    eWasteLicensed: true,
    doeLicenseDoc: 'DOE/E-WASTE/2024/091.pdf',
    status: 'VERIFIED',
    vehicleLabel: 'Heavy E-Waste Carrier',
    vehicleCapacityKg: '2500.00',
    baseLat: 23.7600,
    baseLng: 90.3900,
    serviceRadiusKm: 25,
    capabilityFlags: { collects: true, repairs: false, buys: true, accepts_donations: false },
  });

  const partnerCollector1 = await upsertPartnerRecord({
    userId: collector1User.id,
    orgName: 'Dhanmondi Eco Vans',
    types: ['COLLECTOR'],
    eWasteLicensed: true,
    doeLicenseDoc: 'DOE-LICENSE-2026-4417.pdf',
    status: 'VERIFIED',
    vehicleLabel: 'Pickup van',
    vehicleCapacityKg: '500.00',
    baseLat: 23.7806,
    baseLng: 90.4192,
    serviceRadiusKm: 12,
    capabilityFlags: { collects: true, repairs: false, buys: false, accepts_donations: true },
  });

  const partnerCollector2 = await upsertPartnerRecord({
    userId: collector2User.id,
    orgName: 'Savar Cargo Trikes',
    types: ['COLLECTOR'],
    eWasteLicensed: false,
    doeLicenseDoc: null,
    status: 'VERIFIED',
    vehicleLabel: 'Cargo trike',
    vehicleCapacityKg: '150.00',
    baseLat: 23.7481,
    baseLng: 90.3765,
    serviceRadiusKm: 10,
    capabilityFlags: { collects: true, repairs: false, buys: false, accepts_donations: false },
  });

  await upsertPartnerRecord({
    userId: recycler1User.id,
    orgName: 'Dhaka Steel Recyclers',
    types: ['RECYCLER'],
    eWasteLicensed: false,
    status: 'VERIFIED',
    capabilityFlags: { collects: false, repairs: false, buys: true, accepts_donations: false },
  });

  await upsertPartnerRecord({
    userId: recycler2User.id,
    orgName: 'Narayanganj Metal Works',
    types: ['RECYCLER'],
    eWasteLicensed: false,
    status: 'VERIFIED',
    capabilityFlags: { collects: false, repairs: false, buys: true, accepts_donations: false },
  });

  await upsertPartnerRecord({
    userId: electrofixUser.id,
    orgName: 'ElectroFix Workshop',
    types: ['REPAIR_SHOP'],
    eWasteLicensed: false,
    status: 'VERIFIED',
    capabilityFlags: { collects: false, repairs: true, buys: true, accepts_donations: true },
  });

  const partnerApplicant = await upsertPartnerRecord({
    userId: applicantPartnerUser.id,
    orgName: 'Bengal Recyclers Ltd',
    types: ['RECYCLER'],
    eWasteLicensed: false,
    doeLicenseDoc: 'DOE-CERT-BENGAL-2026.pdf',
    status: 'APPLIED',
    capabilityFlags: {},
  });

  // =========================================================================
  // 4. RATE CARD (All 36 entries: 9 categories × 4 condition bands)
  // =========================================================================
  const allCategories = [
    'PLASTICS',
    'METAL',
    'PAPER',
    'GLASS',
    'E_WASTE',
    'CLOTHES',
    'BOOKS',
    'FURNITURE',
    'APPLIANCES',
  ] as const;

  const conditionMatrix: Record<
    (typeof allCategories)[number],
    { unit: 'kg' | 'piece'; rates: Record<'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR', string> }
  > = {
    PLASTICS: { unit: 'kg', rates: { EXCELLENT: '55.00', GOOD: '45.00', FAIR: '35.00', POOR: '20.00' } },
    METAL: { unit: 'kg', rates: { EXCELLENT: '140.00', GOOD: '110.00', FAIR: '80.00', POOR: '50.00' } },
    PAPER: { unit: 'kg', rates: { EXCELLENT: '32.00', GOOD: '25.00', FAIR: '18.00', POOR: '10.00' } },
    GLASS: { unit: 'kg', rates: { EXCELLENT: '24.00', GOOD: '18.00', FAIR: '12.00', POOR: '6.00' } },
    E_WASTE: { unit: 'piece', rates: { EXCELLENT: '350.00', GOOD: '250.00', FAIR: '150.00', POOR: '75.00' } },
    CLOTHES: { unit: 'kg', rates: { EXCELLENT: '45.00', GOOD: '30.00', FAIR: '20.00', POOR: '10.00' } },
    BOOKS: { unit: 'kg', rates: { EXCELLENT: '50.00', GOOD: '35.00', FAIR: '22.00', POOR: '12.00' } },
    FURNITURE: { unit: 'kg', rates: { EXCELLENT: '130.00', GOOD: '95.00', FAIR: '60.00', POOR: '30.00' } },
    APPLIANCES: { unit: 'piece', rates: { EXCELLENT: '750.00', GOOD: '500.00', FAIR: '300.00', POOR: '150.00' } },
  };

  const seededRateMap = new Map<string, typeof rateCardEntries.$inferSelect>();
  for (const cat of allCategories) {
    const config = conditionMatrix[cat];
    for (const [cond, price] of Object.entries(config.rates)) {
      const [existingRate] = await db
        .select()
        .from(rateCardEntries)
        .where(
          and(
            eq(rateCardEntries.category, cat),
            eq(rateCardEntries.condition_band, cond),
            eq(rateCardEntries.unit, config.unit)
          )
        )
        .limit(1);

      if (existingRate) {
        const [updated] = await db
          .update(rateCardEntries)
          .set({ price_bdt: price, effective_from: new Date(Date.now() - 3600000) })
          .where(eq(rateCardEntries.id, existingRate.id))
          .returning();
        seededRateMap.set(`${cat}:${cond}`, updated);
      } else {
        const [inserted] = await db
          .insert(rateCardEntries)
          .values({
            category: cat,
            condition_band: cond,
            unit: config.unit,
            price_bdt: price,
            effective_from: new Date(Date.now() - 3600000),
            updated_by: adminOrgUser.id,
          })
          .returning();
        seededRateMap.set(`${cat}:${cond}`, inserted);
      }
    }
  }

  // =========================================================================
  // 5. COMMODITY BENCHMARKS (9 categories)
  // =========================================================================
  const seedBenchmarks = [
    { category: 'METAL', commodity_symbol: 'LME-SCRAP-METAL', global_price_usd: '0.95', fx_rate_usd_bdt: '122.50', benchmark_bdt: '116.38', source: 'LME Scrap Metal Composite' },
    { category: 'PLASTICS', commodity_symbol: 'PET-PLASTIC-IDX', global_price_usd: '0.38', fx_rate_usd_bdt: '122.50', benchmark_bdt: '46.55', source: 'Global Polyethylene/PET Index' },
    { category: 'PAPER', commodity_symbol: 'PULP-PAPER-IDX', global_price_usd: '0.22', fx_rate_usd_bdt: '122.50', benchmark_bdt: '26.95', source: 'Global Recovered Paper Index' },
    { category: 'GLASS', commodity_symbol: 'CULLET-GLASS-IDX', global_price_usd: '0.15', fx_rate_usd_bdt: '122.50', benchmark_bdt: '18.38', source: 'Cullet Glass Composite' },
    { category: 'E_WASTE', commodity_symbol: 'EWASTE-PCB-METALS', global_price_usd: '2.10', fx_rate_usd_bdt: '122.50', benchmark_bdt: '257.25', source: 'Precious E-Waste Scrap Index' },
    { category: 'CLOTHES', commodity_symbol: 'TEXTILE-RECYCLE', global_price_usd: '0.28', fx_rate_usd_bdt: '122.50', benchmark_bdt: '34.30', source: 'Global Recycled Textile Feed' },
    { category: 'BOOKS', commodity_symbol: 'PRINT-PAPER-PULP', global_price_usd: '0.25', fx_rate_usd_bdt: '122.50', benchmark_bdt: '30.63', source: 'Recovered Print Pulp Feed' },
    { category: 'FURNITURE', commodity_symbol: 'WOOD-COMPOSITE', global_price_usd: '0.80', fx_rate_usd_bdt: '122.50', benchmark_bdt: '98.00', source: 'Reclaimed Timber & Furniture Index' },
    { category: 'APPLIANCES', commodity_symbol: 'APPLIANCE-SCRAP', global_price_usd: '4.50', fx_rate_usd_bdt: '122.50', benchmark_bdt: '551.25', source: 'Major Appliance Recovery Feed' },
  ];

  for (const bm of seedBenchmarks) {
    const [existingBm] = await db.select().from(rateBenchmarks).where(eq(rateBenchmarks.category, bm.category)).limit(1);
    if (existingBm) {
      await db.update(rateBenchmarks).set(bm).where(eq(rateBenchmarks.id, existingBm.id));
    } else {
      await db.insert(rateBenchmarks).values(bm);
    }
  }

  // =========================================================================
  // 6. EMISSION FACTORS (Baseline Carbon Avoidance Factors)
  // =========================================================================
  const baselineEmissionFactors = [
    { category: 'PLASTICS', next_life_path: 'RECYCLE', factor_co2e_per_kg: '1.4500', range_low: '1.2000', range_high: '1.7000', source: 'ISO 14044 / DEFRA 2024', version: 'v2026.1' },
    { category: 'PAPER', next_life_path: 'RECYCLE', factor_co2e_per_kg: '0.9500', range_low: '0.8000', range_high: '1.1000', source: 'ISO 14044 / EPA WARM v15', version: 'v2026.1' },
    { category: 'METAL', next_life_path: 'RECYCLE', factor_co2e_per_kg: '2.8500', range_low: '2.4000', range_high: '3.3000', source: 'Birkenhead Life-Cycle / WorldSteel', version: 'v2026.1' },
    { category: 'GLASS', next_life_path: 'RECYCLE', factor_co2e_per_kg: '0.3150', range_low: '0.2500', range_high: '0.3800', source: 'FEVE European Container Glass', version: 'v2026.1' },
    { category: 'E_WASTE', next_life_path: 'RECYCLE', factor_co2e_per_kg: '8.2000', range_low: '6.5000', range_high: '10.0000', source: 'UNEP Global E-Waste Monitor', version: 'v2026.1' },
    { category: 'CLOTHES', next_life_path: 'REUSE', factor_co2e_per_kg: '3.2000', range_low: '2.8000', range_high: '3.6000', source: 'WRAP UK Textile Reuse Index', version: 'v2026.1' },
    { category: 'BOOKS', next_life_path: 'REUSE', factor_co2e_per_kg: '1.1000', range_low: '0.9000', range_high: '1.3000', source: 'EPA Paper & Pulp Reuse Model', version: 'v2026.1' },
    { category: 'FURNITURE', next_life_path: 'REPAIR', factor_co2e_per_kg: '2.1000', range_low: '1.8000', range_high: '2.5000', source: 'Circular Economy Timber Model', version: 'v2026.1' },
    { category: 'APPLIANCES', next_life_path: 'RESELL', factor_co2e_per_kg: '15.5000', range_low: '12.0000', range_high: '19.0000', source: 'IEA Domestic Appliance Lifecycle', version: 'v2026.1' },
  ];

  for (const factor of baselineEmissionFactors) {
    const [existing] = await db
      .select()
      .from(emissionFactors)
      .where(and(eq(emissionFactors.category, factor.category), eq(emissionFactors.next_life_path, factor.next_life_path)))
      .limit(1);

    if (existing) {
      await db.update(emissionFactors).set(factor).where(eq(emissionFactors.id, existing.id));
    } else {
      await db.insert(emissionFactors).values({
        ...factor,
        effective_from: new Date(Date.now() - 30 * 86400_000),
      });
    }
  }

  // =========================================================================
  // 7. DROP ZONES & TELEMETRY LOGS
  // =========================================================================
  async function upsertDropZoneRecord(spec: {
    institutionId: string;
    name: string;
    qrToken: string;
    acceptedCategories: string[];
    geoLocation: { lat: number; lng: number; address: string };
    maxCapacityKg: string;
    currentFillKg: string;
    status: string;
    contractedPartnerId: string;
  }) {
    const [existing] = await db.select().from(dropZones).where(eq(dropZones.qr_token, spec.qrToken)).limit(1);
    if (existing) {
      const [updated] = await db
        .update(dropZones)
        .set({
          institution_id: spec.institutionId,
          name: spec.name,
          geo_location: spec.geoLocation,
          accepted_categories: spec.acceptedCategories,
          max_capacity_kg: spec.maxCapacityKg,
          current_fill_kg: spec.currentFillKg,
          status: spec.status,
          contracted_partner_id: spec.contractedPartnerId,
        })
        .where(eq(dropZones.id, existing.id))
        .returning();
      return updated;
    }
    const [inserted] = await db
      .insert(dropZones)
      .values({
        institution_id: spec.institutionId,
        name: spec.name,
        qr_token: spec.qrToken,
        accepted_categories: spec.acceptedCategories,
        geo_location: spec.geoLocation,
        max_capacity_kg: spec.maxCapacityKg,
        current_fill_kg: spec.currentFillKg,
        status: spec.status,
        contracted_partner_id: spec.contractedPartnerId,
      })
      .returning();
    return inserted;
  }

  const bracuZone = await upsertDropZoneRecord({
    institutionId: 'BRACU',
    name: 'BRACU Building 1 Cafeteria Bin',
    qrToken: 'ZONE-BRACU-01',
    acceptedCategories: ['PLASTICS', 'PAPER', 'METAL'],
    geoLocation: { lat: 23.7740, lng: 90.4250, address: 'Kha-224, Bir Uttam Rafiqul Islam Ave, Merul Badda, Dhaka' },
    maxCapacityKg: '100.00',
    currentFillKg: '45.00',
    status: 'ACTIVE',
    contractedPartnerId: partnerBengalCollector.id,
  });

  const buetZone = await upsertDropZoneRecord({
    institutionId: 'BUET',
    name: 'BUET Civil Dept Green Hub',
    qrToken: 'ZONE-BUET-02',
    acceptedCategories: ['PLASTICS', 'E_WASTE', 'PAPER'],
    geoLocation: { lat: 23.7260, lng: 90.3920, address: 'Civil Dept Ground Floor, BUET Campus, Palashi, Dhaka' },
    maxCapacityKg: '150.00',
    currentFillKg: '68.00',
    status: 'ACTIVE',
    contractedPartnerId: partnerDhakaRecycler.id,
  });

  const nsuZone = await upsertDropZoneRecord({
    institutionId: 'NSU',
    name: 'NSU Student Lounge Drop Point',
    qrToken: 'ZONE-NSU-03',
    acceptedCategories: ['PLASTICS', 'BOOKS', 'CLOTHES'],
    geoLocation: { lat: 23.8150, lng: 90.4270, address: 'Level 3 Student Lounge, NSU Campus, Bashundhara, Dhaka' },
    maxCapacityKg: '80.00',
    currentFillKg: '70.40',
    status: 'ACTIVE',
    contractedPartnerId: partnerCollector1.id,
  });

  // Telemetry logs
  const zoneLogs = [
    { zoneId: bracuZone.id, recordedFillKg: '45.00', capacityPercentage: 45, status: 'NORMAL', triggerReason: 'DEPOSIT_ACCUMULATION' },
    { zoneId: bracuZone.id, recordedFillKg: '25.00', capacityPercentage: 25, status: 'NORMAL', triggerReason: 'COLLECTOR_EMPTYING' },
    { zoneId: buetZone.id, recordedFillKg: '68.00', capacityPercentage: 45, status: 'NORMAL', triggerReason: 'DEPOSIT_ACCUMULATION' },
    { zoneId: buetZone.id, recordedFillKg: '102.00', capacityPercentage: 68, status: 'NORMAL', triggerReason: 'SENSOR_TELEMETRY' },
    { zoneId: nsuZone.id, recordedFillKg: '50.00', capacityPercentage: 62, status: 'NORMAL', triggerReason: 'DEPOSIT_ACCUMULATION' },
    { zoneId: nsuZone.id, recordedFillKg: '70.40', capacityPercentage: 88, status: 'OVERFLOW_ALARM', triggerReason: 'SENSOR_TELEMETRY' },
  ];

  for (const log of zoneLogs) {
    const [existing] = await db
      .select()
      .from(zoneCapacityLogs)
      .where(and(eq(zoneCapacityLogs.zone_id, log.zoneId), eq(zoneCapacityLogs.capacity_percentage, log.capacityPercentage)))
      .limit(1);
    if (!existing) {
      await db.insert(zoneCapacityLogs).values({
        zone_id: log.zoneId,
        recorded_fill_kg: log.recordedFillKg,
        capacity_percentage: log.capacityPercentage,
        status: log.status,
        trigger_reason: log.triggerReason,
        logged_at: new Date(Date.now() - 3600_000),
      });
    }
  }

  // Zone emptying record
  const [existingEmptying] = await db.select().from(zoneEmptyingRecords).where(eq(zoneEmptyingRecords.zone_id, bracuZone.id)).limit(1);
  if (!existingEmptying) {
    await db.insert(zoneEmptyingRecords).values({
      zone_id: bracuZone.id,
      collector_partner_id: partnerBengalCollector.id,
      scale_readings_json: { PLASTICS: 45.0, PAPER: 20.0 },
      evidence_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
      total_mass_kg: '65.00',
      emptied_at: new Date(Date.now() - 3 * 86400_000),
    });
  }

  // =========================================================================
  // 8. MARKETPLACE LISTINGS & PRIVACY-STRIPPED MEDIA
  // =========================================================================
  async function upsertListingRecord(spec: {
    ownerId: string;
    category: string;
    unit: string;
    declaredWeight?: string;
    pieceCount?: number;
    declaredCondition: string;
    priceBdt: string;
    status: string;
    lat: number;
    lng: number;
    thana: string;
    zilla: string;
    photos: string[];
  }) {
    const [existing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.owner_id, spec.ownerId), eq(listings.category, spec.category), eq(listings.price_bdt, spec.priceBdt)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(listings)
        .set({
          unit: spec.unit,
          declared_weight: spec.declaredWeight,
          piece_count: spec.pieceCount,
          declared_condition: spec.declaredCondition,
          status: spec.status,
          lat: spec.lat,
          lng: spec.lng,
          thana: spec.thana,
          zilla: spec.zilla,
          photos: spec.photos,
        })
        .where(eq(listings.id, existing.id))
        .returning();
      return updated;
    }

    const [inserted] = await db
      .insert(listings)
      .values({
        owner_id: spec.ownerId,
        category: spec.category,
        unit: spec.unit,
        declared_weight: spec.declaredWeight,
        piece_count: spec.pieceCount,
        declared_condition: spec.declaredCondition,
        price_bdt: spec.priceBdt,
        status: spec.status,
        lat: spec.lat,
        lng: spec.lng,
        thana: spec.thana,
        zilla: spec.zilla,
        photos: spec.photos,
      })
      .returning();
    return inserted;
  }

  // Listing 1: 40kg Sorted Copper Wire (Tejgaon) - Used in Scenarios 4 & 5
  const listingCopper40kg = await upsertListingRecord({
    ownerId: student1User.id,
    category: 'METAL',
    unit: 'kg',
    declaredWeight: '40.00',
    declaredCondition: 'GOOD',
    priceBdt: '28800.00', // ৳720/kg
    status: 'ACTIVE',
    lat: 23.7610,
    lng: 90.3910,
    thana: 'Tejgaon',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'],
  });

  // Listing 2: 500kg Industrial Copper Cable Scrap (Tejgaon) - Used in Scenario 5
  const listingCopper500kg = await upsertListingRecord({
    ownerId: student2User.id,
    category: 'METAL',
    unit: 'kg',
    declaredWeight: '500.00',
    declaredCondition: 'EXCELLENT',
    priceBdt: '370000.00', // ৳740/kg
    status: 'ACTIVE',
    lat: 23.7620,
    lng: 90.3920,
    thana: 'Tejgaon',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80'],
  });

  // Listing 3: 12.5kg Mixed PET Bottles & HDPE Plastic (Dhanmondi)
  const listingPlastics = await upsertListingRecord({
    ownerId: normalUser.id,
    category: 'PLASTICS',
    unit: 'kg',
    declaredWeight: '12.50',
    declaredCondition: 'GOOD',
    priceBdt: '562.50',
    status: 'ACTIVE',
    lat: 23.7820,
    lng: 90.4205,
    thana: 'Dhanmondi',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80'],
  });

  // Listing 4: 120kg Industrial Cardboard Boxes (Mirpur)
  const listingPaper = await upsertListingRecord({
    ownerId: normalUser.id,
    category: 'PAPER',
    unit: 'kg',
    declaredWeight: '120.00',
    declaredCondition: 'FAIR',
    priceBdt: '2160.00',
    status: 'ACTIVE',
    lat: 23.8050,
    lng: 90.3680,
    thana: 'Mirpur',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=600&q=80'],
  });

  // Listing 5: Defective Microwave Oven (Dhanmondi)
  const listingAppliance = await upsertListingRecord({
    ownerId: student1User.id,
    category: 'APPLIANCES',
    unit: 'piece',
    pieceCount: 1,
    declaredCondition: 'FAIR',
    priceBdt: '1400.00',
    status: 'ACTIVE',
    lat: 23.7465,
    lng: 90.3760,
    thana: 'Dhanmondi',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=600&q=80'],
  });

  // Listing 6: Mixed Circuit Boards & Motherboards (Gulshan)
  const listingEwaste = await upsertListingRecord({
    ownerId: student2User.id,
    category: 'E_WASTE',
    unit: 'piece',
    pieceCount: 8,
    declaredCondition: 'GOOD',
    priceBdt: '3200.00',
    status: 'ACTIVE',
    lat: 23.7925,
    lng: 90.4078,
    thana: 'Gulshan',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80'],
  });

  // Listing 7: 15kg University Textbooks (Badda)
  const listingBooks = await upsertListingRecord({
    ownerId: student1User.id,
    category: 'BOOKS',
    unit: 'kg',
    declaredWeight: '15.00',
    declaredCondition: 'EXCELLENT',
    priceBdt: '750.00',
    status: 'ACTIVE',
    lat: 23.7740,
    lng: 90.4250,
    thana: 'Badda',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=600&q=80'],
  });

  // Listing 8: 20kg Sorted Cotton Garments (Shahbag)
  const listingClothes = await upsertListingRecord({
    ownerId: normalUser.id,
    category: 'CLOTHES',
    unit: 'kg',
    declaredWeight: '20.00',
    declaredCondition: 'GOOD',
    priceBdt: '600.00',
    status: 'ACTIVE',
    lat: 23.7340,
    lng: 90.3928,
    thana: 'Shahbag',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80'],
  });

  // Seed listing media rows with privacy-stripped guarantee
  const allListings = [
    listingCopper40kg,
    listingCopper500kg,
    listingPlastics,
    listingPaper,
    listingAppliance,
    listingEwaste,
    listingBooks,
    listingClothes,
  ];

  for (const l of allListings) {
    const [existingMedia] = await db.select().from(listingMedia).where(eq(listingMedia.listing_id, l.id)).limit(1);
    if (!existingMedia && l.photos && (l.photos as string[]).length > 0) {
      await db.insert(listingMedia).values({
        listing_id: l.id,
        uploader_id: l.owner_id,
        storage_provider: 'CLOUDINARY',
        public_url: (l.photos as string[])[0],
        thumbnail_url: (l.photos as string[])[0],
        original_filename: `scrap-${l.category.toLowerCase()}.webp`,
        mime_type: 'image/webp',
        byte_size: 142000,
        is_privacy_stripped: true,
      });
    }
  }

  // =========================================================================
  // 9. SCENARIO 5: REVERSE DEMAND AUTO-MATCH (Recycler Rahim 500kg Copper)
  // =========================================================================
  const [existingDemand] = await db
    .select()
    .from(buyerDemands)
    .where(and(eq(buyerDemands.buyer_id, recyclerRahimUser.id), eq(buyerDemands.category, 'METAL')))
    .limit(1);

  let demandRahim: typeof buyerDemands.$inferSelect;
  if (existingDemand) {
    const [updated] = await db
      .update(buyerDemands)
      .set({
        min_quantity: '500.00',
        max_quantity: '1000.00',
        unit: 'kg',
        max_price_per_unit_bdt: '750.00',
        target_thana: 'Tejgaon',
        target_lat: 23.7600,
        target_lng: 90.3900,
        max_radius_km: 15,
        status: 'ACTIVE',
        expires_at: new Date(Date.now() + 30 * 86400_000),
      })
      .where(eq(buyerDemands.id, existingDemand.id))
      .returning();
    demandRahim = updated;
  } else {
    const [inserted] = await db
      .insert(buyerDemands)
      .values({
        buyer_id: recyclerRahimUser.id,
        category: 'METAL',
        min_quantity: '500.00',
        max_quantity: '1000.00',
        unit: 'kg',
        max_price_per_unit_bdt: '750.00',
        target_thana: 'Tejgaon',
        target_lat: 23.7600,
        target_lng: 90.3900,
        max_radius_km: 15,
        status: 'ACTIVE',
        expires_at: new Date(Date.now() + 30 * 86400_000),
      })
      .returning();
    demandRahim = inserted;
  }

  // Seed 2 demand matches
  const match1Check = await db
    .select()
    .from(demandMatches)
    .where(and(eq(demandMatches.demand_id, demandRahim.id), eq(demandMatches.listing_id, listingCopper40kg.id)))
    .limit(1);
  if (match1Check.length === 0) {
    await db.insert(demandMatches).values({
      demand_id: demandRahim.id,
      listing_id: listingCopper40kg.id,
      match_score: '0.95',
      distance_km: '1.20',
      notification_sent: true,
      status: 'UNNOTICED',
    });
  }

  const match2Check = await db
    .select()
    .from(demandMatches)
    .where(and(eq(demandMatches.demand_id, demandRahim.id), eq(demandMatches.listing_id, listingCopper500kg.id)))
    .limit(1);
  if (match2Check.length === 0) {
    await db.insert(demandMatches).values({
      demand_id: demandRahim.id,
      listing_id: listingCopper500kg.id,
      match_score: '0.98',
      distance_km: '0.80',
      notification_sent: true,
      status: 'VIEWED',
    });
  }

  // =========================================================================
  // 10. SCENARIO 4: REAL-TIME COUNTER-OFFER NEGOTIATION (Buyer Faruk vs Seller)
  // =========================================================================
  const [existingThread] = await db
    .select()
    .from(negotiationThreads)
    .where(
      and(
        eq(negotiationThreads.listing_id, listingCopper40kg.id),
        eq(negotiationThreads.buyer_id, buyerFarukUser.id),
        eq(negotiationThreads.seller_id, student1User.id)
      )
    )
    .limit(1);

  let negThread: typeof negotiationThreads.$inferSelect;
  if (existingThread) {
    negThread = existingThread;
  } else {
    const [inserted] = await db
      .insert(negotiationThreads)
      .values({
        listing_id: listingCopper40kg.id,
        buyer_id: buyerFarukUser.id,
        seller_id: student1User.id,
        status: 'OPEN',
      })
      .returning();
    negThread = inserted;
  }

  // Offer 1: Buyer Faruk offered ৳700/kg (Total ৳28,000) - SUPERSEDED
  const [existingOffer1] = await db
    .select()
    .from(negotiationOffers)
    .where(and(eq(negotiationOffers.thread_id, negThread.id), eq(negotiationOffers.offered_by_user_id, buyerFarukUser.id)))
    .limit(1);

  if (!existingOffer1) {
    await db.insert(negotiationOffers).values({
      thread_id: negThread.id,
      offered_by_user_id: buyerFarukUser.id,
      offer_amount_bdt: '28000.00',
      offered_quantity: '40.00',
      unit: 'kg',
      status: 'SUPERSEDED',
      expires_at: new Date(Date.now() + 22 * 3600_000),
      notes: 'Can pick up tomorrow morning from Tejgaon warehouse.',
    });
  }

  // Offer 2: Seller countered with ৳740/kg (Total ৳29,600) - PENDING with 18h remaining
  const [existingOffer2] = await db
    .select()
    .from(negotiationOffers)
    .where(and(eq(negotiationOffers.thread_id, negThread.id), eq(negotiationOffers.offered_by_user_id, student1User.id)))
    .limit(1);

  let offer2Id: string;
  if (existingOffer2) {
    await db
      .update(negotiationOffers)
      .set({
        offer_amount_bdt: '29600.00',
        offered_quantity: '40.00',
        status: 'PENDING',
        expires_at: new Date(Date.now() + 18 * 3600_000),
      })
      .where(eq(negotiationOffers.id, existingOffer2.id));
    offer2Id = existingOffer2.id;
  } else {
    const [inserted] = await db
      .insert(negotiationOffers)
      .values({
        thread_id: negThread.id,
        offered_by_user_id: student1User.id,
        offer_amount_bdt: '29600.00',
        offered_quantity: '40.00',
        unit: 'kg',
        status: 'PENDING',
        expires_at: new Date(Date.now() + 18 * 3600_000),
        notes: 'High purity wire, ৳740 is my final price.',
      })
      .returning();
    offer2Id = inserted.id;
  }

  await db.update(negotiationThreads).set({ last_offer_id: offer2Id }).where(eq(negotiationThreads.id, negThread.id));

  // =========================================================================
  // 11. SCENARIO 1: LIVE AUCTIONS (Lot #101 & Anti-Snipe Lot #102)
  // =========================================================================
  // Lot #101: 500kg Mixed Copper Cables (৳280k starting, ৳320k reserve met, 4 competing bids, ~15m remaining)
  await ensureAuctionLot({
    lot: {
      title: 'Lot #101: 500kg Mixed Copper Cables',
      description: 'Industrial grade mixed copper cables stripped and sorted from telecommunications upgrade. High purity electrolytic copper content.',
      category: 'METAL',
      quantity_kg: '500.00',
      starting_price_bdt: '280000.00',
      reserve_price_bdt: '320000.00',
      origin_label: 'Tejgaon Industrial Area, Dhaka',
      status: 'LIVE',
      opens_at: new Date(Date.now() - 30 * 60_000),
      closes_at: new Date(Date.now() + 15 * 60_000),
      created_by: partnerUser.id,
    },
    bids: [
      { bidderUserId: recycler1User.id, amount: '285000.00', minutesAgo: 25 },
      { bidderUserId: recycler2User.id, amount: '295000.00', minutesAgo: 20 },
      { bidderUserId: buyerFarukUser.id, amount: '310000.00', minutesAgo: 10 },
      { bidderUserId: recycler1User.id, amount: '325000.00', minutesAgo: 3 }, // Reserve met! (৳325k >= ৳320k)
    ],
    refreshWindow: { opensMinutesAgo: 30, closesMinutesFromNow: 15 },
  });

  // Lot #102: Anti-Snipe Target (5 mins remaining, 0 bids)
  await ensureAuctionLot({
    lot: {
      title: 'Lot #102: 800kg Mixed Ferrous Scrap & Steel Offcuts',
      description: 'Compressed MSAL offcuts, gates and shelving from a full floor clear-out. Sorted, dry, under cover.',
      category: 'METAL',
      quantity_kg: '800.00',
      starting_price_bdt: '40000.00',
      reserve_price_bdt: '52345.00',
      origin_label: 'Narayanganj EPZ',
      status: 'LIVE',
      opens_at: new Date(Date.now() - 25 * 60_000),
      closes_at: new Date(Date.now() + 5 * 60_000),
      created_by: partnerUser.id,
    },
    bids: [],
    refreshWindow: { opensMinutesAgo: 25, closesMinutesFromNow: 5 },
  });

  // Lot #098: Ended Lot (Sold above reserve)
  const lotEndedSold = await ensureAuctionLot({
    lot: {
      title: 'Lot #098: 1200kg Cullet Glass - Bottling Plant Line Purge',
      description: 'Crushed flint and amber cullet from a beverage line changeover, contamination screened.',
      category: 'GLASS',
      quantity_kg: '1200.00',
      starting_price_bdt: '12000.00',
      reserve_price_bdt: '15000.00',
      origin_label: 'Gazipur beverage plant',
      status: 'ENDED',
      opens_at: new Date(Date.now() - 26 * 3600_000),
      closes_at: new Date(Date.now() - 2 * 3600_000),
      created_by: partnerUser.id,
    },
    bids: [
      { bidderUserId: recycler1User.id, amount: '12050.00', minutesAgo: 25 * 60 },
      { bidderUserId: recycler2User.id, amount: '13000.00', minutesAgo: 24 * 60 },
      { bidderUserId: recycler1User.id, amount: '15100.00', minutesAgo: 2 * 60 + 10 },
    ],
    winningBid: true,
  });

  // Lot #095: Ended Lot (No sale - below reserve)
  await ensureAuctionLot({
    lot: {
      title: 'Lot #095: 950kg Cardboard Bales - Retail Chain Backrooms',
      description: 'OCC bales collected across six retail backrooms. Some tape residue.',
      category: 'PAPER',
      quantity_kg: '950.00',
      starting_price_bdt: '8000.00',
      reserve_price_bdt: '10500.00',
      origin_label: 'Banani retail strip',
      status: 'ENDED',
      opens_at: new Date(Date.now() - 50 * 3600_000),
      closes_at: new Date(Date.now() - 26 * 3600_000),
      created_by: partnerUser.id,
    },
    bids: [
      { bidderUserId: recycler2User.id, amount: '8050.00', minutesAgo: 27 * 60 },
    ],
  });

  // =========================================================================
  // 12. LOGISTICS: PICKUP ORDERS, DISPATCH & OTP CHALLENGE
  // =========================================================================
  // Order 1: Assigned to Dhanmondi van (with OTP Challenge active)
  const [existingOrder1] = await db
    .select()
    .from(pickupOrders)
    .where(and(eq(pickupOrders.customer_id, normalUser.id), eq(pickupOrders.status, 'ASSIGNED')))
    .limit(1);

  let pickupOrder1: typeof pickupOrders.$inferSelect;
  if (existingOrder1) {
    pickupOrder1 = existingOrder1;
  } else {
    const [inserted] = await db
      .insert(pickupOrders)
      .values({
        listing_id: listingPlastics.id,
        customer_id: normalUser.id,
        collector_partner_id: partnerCollector1.id,
        status: 'ASSIGNED',
        source_type: 'LISTING',
        address: 'House 12, Road 5, Dhanmondi, Dhaka',
        lat: 23.7820,
        lng: 90.4205,
        scheduled_for: new Date(Date.now() + 2 * 3600_000),
        notes: 'Ring the bell twice, gate is on Road 5',
      })
      .returning();
    pickupOrder1 = inserted;

    await db.insert(dispatchAssignments).values({
      order_id: pickupOrder1.id,
      collector_partner_id: partnerCollector1.id,
      stop_sequence: 1,
      distance_km: '0.20',
      eta_minutes: 1,
    });
  }

  // Order 2: Requested
  const [existingOrder2] = await db
    .select()
    .from(pickupOrders)
    .where(and(eq(pickupOrders.customer_id, normalUser.id), eq(pickupOrders.status, 'REQUESTED')))
    .limit(1);
  if (!existingOrder2) {
    await db.insert(pickupOrders).values({
      listing_id: listingPaper.id,
      customer_id: normalUser.id,
      status: 'REQUESTED',
      source_type: 'LISTING',
      address: 'Flat 4B, House 27, Ring Road, Shyamoli, Dhaka',
      lat: 23.7495,
      lng: 90.3780,
      scheduled_for: new Date(Date.now() + 26 * 3600_000),
    });
  }

  // Order 3: Collected (Shahbagh)
  const [existingOrder3] = await db
    .select()
    .from(pickupOrders)
    .where(and(eq(pickupOrders.customer_id, student2User.id), eq(pickupOrders.status, 'COLLECTED')))
    .limit(1);
  let pickupOrder3: typeof pickupOrders.$inferSelect;
  if (existingOrder3) {
    pickupOrder3 = existingOrder3;
  } else {
    const [inserted] = await db
      .insert(pickupOrders)
      .values({
        listing_id: listingClothes.id,
        customer_id: student2User.id,
        collector_partner_id: partnerBengalCollector.id,
        status: 'COLLECTED',
        source_type: 'LISTING',
        address: 'Shahbagh Campus Gate 2, Dhaka',
        lat: 23.7340,
        lng: 90.3928,
        scheduled_for: new Date(Date.now() - 4 * 3600_000),
      })
      .returning();
    pickupOrder3 = inserted;
  }

  // Custody Handover 1: Active 6-digit OTP challenge ('384912') ready for live demo
  const [existingHandover1] = await db
    .select()
    .from(custodyHandovers)
    .where(eq(custodyHandovers.task_id, pickupOrder1.id))
    .limit(1);
  const otpHash1 = crypto.createHash('sha256').update('384912').digest('hex');
  if (existingHandover1) {
    await db
      .update(custodyHandovers)
      .set({
        otp_code_hash: otpHash1,
        status: 'PENDING',
        expires_at: new Date(Date.now() + 15 * 60_000),
      })
      .where(eq(custodyHandovers.id, existingHandover1.id));
  } else {
    await db.insert(custodyHandovers).values({
      task_id: pickupOrder1.id,
      otp_code_hash: otpHash1,
      giver_user_id: normalUser.id,
      collector_partner_id: partnerCollector1.id,
      status: 'PENDING',
      expires_at: new Date(Date.now() + 15 * 60_000),
    });
  }

  // Custody Handover 2: Confirmed handover
  const [existingHandover2] = await db
    .select()
    .from(custodyHandovers)
    .where(eq(custodyHandovers.task_id, pickupOrder3.id))
    .limit(1);
  if (!existingHandover2) {
    await db.insert(custodyHandovers).values({
      task_id: pickupOrder3.id,
      otp_code_hash: crypto.createHash('sha256').update('123456').digest('hex'),
      giver_user_id: student2User.id,
      collector_partner_id: partnerBengalCollector.id,
      status: 'CONFIRMED',
      expires_at: new Date(Date.now() - 4 * 3600_000),
      confirmed_at: new Date(Date.now() - 4 * 3600_000),
    });
  }

  // =========================================================================
  // 13. TRUST GATE, THRESHOLDS, SCENARIO 3 & ESCALATION WORKLIST
  // =========================================================================
  // Dynamic Trust Threshold Config
  const [existingConfig] = await db.select().from(trustThresholdConfigs).limit(1);
  if (!existingConfig) {
    await db.insert(trustThresholdConfigs).values({
      config_json: {
        phash_hamming_distance_threshold: 5,
        geofence_radius_meters: 500,
        quantity_divergence_tolerance_ratio: 0.20,
        user_daily_deposit_velocity_cap: 10,
        user_daily_credit_velocity_bdt: 5000,
        partner_daily_confirmation_velocity_cap: 50,
        max_consecutive_identical_pairings: 5,
        young_account_days_threshold: 7,
        young_account_max_claim_bdt: 1000,
        flag_threshold_for_suspension: 3,
        audit_sample_rate_percentage: 10,
      },
      effective_from: new Date(Date.now() - 30 * 86400_000),
      updated_by: adminOrgUser.id,
    });
  }

  // Active Drop Sessions
  // Session 1: Active Open session (expires in 12 minutes)
  const [existingSession1] = await db
    .select()
    .from(dropSessions)
    .where(eq(dropSessions.session_secret, 'sec-bracu-open-01'))
    .limit(1);
  if (existingSession1) {
    await db
      .update(dropSessions)
      .set({ status: 'OPEN', expires_at: new Date(Date.now() + 12 * 60_000) })
      .where(eq(dropSessions.id, existingSession1.id));
  } else {
    await db.insert(dropSessions).values({
      zone_id: bracuZone.id,
      user_id: student1User.id,
      session_secret: 'sec-bracu-open-01',
      short_code: '7392',
      status: 'OPEN',
      expires_at: new Date(Date.now() + 12 * 60_000),
    });
  }

  // Session 2: Consumed session for SCENARIO 2 (Pending Deposit)
  const [existingSession2] = await db
    .select()
    .from(dropSessions)
    .where(eq(dropSessions.session_secret, 'sec-bracu-pending-02'))
    .limit(1);
  let session2: typeof dropSessions.$inferSelect;
  if (existingSession2) {
    session2 = existingSession2;
  } else {
    const [inserted] = await db
      .insert(dropSessions)
      .values({
        zone_id: bracuZone.id,
        user_id: student1User.id,
        session_secret: 'sec-bracu-pending-02',
        short_code: '4815',
        status: 'CONSUMED',
        expires_at: new Date(Date.now() - 30 * 60_000),
      })
      .returning();
    session2 = inserted;
  }

  // Session 3: Consumed session for SCENARIO 3 Item E-891 (Broken UPS Battery)
  const [existingSession3] = await db
    .select()
    .from(dropSessions)
    .where(eq(dropSessions.session_secret, 'sec-buet-ewaste-03'))
    .limit(1);
  let session3: typeof dropSessions.$inferSelect;
  if (existingSession3) {
    session3 = existingSession3;
  } else {
    const [inserted] = await db
      .insert(dropSessions)
      .values({
        zone_id: buetZone.id,
        user_id: student2User.id,
        session_secret: 'sec-buet-ewaste-03',
        short_code: '8910',
        status: 'CONSUMED',
        expires_at: new Date(Date.now() - 60 * 60_000),
      })
      .returning();
    session3 = inserted;
  }

  // Session 4: Consumed session for SCENARIO 3 Item D-402 (pHash Duplicate)
  const [existingSession4] = await db
    .select()
    .from(dropSessions)
    .where(eq(dropSessions.session_secret, 'sec-bracu-phash-04'))
    .limit(1);
  let session4: typeof dropSessions.$inferSelect;
  if (existingSession4) {
    session4 = existingSession4;
  } else {
    const [inserted] = await db
      .insert(dropSessions)
      .values({
        zone_id: bracuZone.id,
        user_id: normalUser.id,
        session_secret: 'sec-bracu-phash-04',
        short_code: '4021',
        status: 'CONSUMED',
        expires_at: new Date(Date.now() - 90 * 60_000),
      })
      .returning();
    session4 = inserted;
  }

  // Session 5: Consumed session for Verified Deposit (Student 1)
  const [existingSession5] = await db
    .select()
    .from(dropSessions)
    .where(eq(dropSessions.session_secret, 'sec-bracu-verified-05'))
    .limit(1);
  let session5: typeof dropSessions.$inferSelect;
  if (existingSession5) {
    session5 = existingSession5;
  } else {
    const [inserted] = await db
      .insert(dropSessions)
      .values({
        zone_id: bracuZone.id,
        user_id: student1User.id,
        session_secret: 'sec-bracu-verified-05',
        short_code: '1001',
        status: 'CONSUMED',
        expires_at: new Date(Date.now() - 120 * 60_000),
      })
      .returning();
    session5 = inserted;
  }

  // Deposit Records
  // Deposit 1 (SCENARIO 2: 4.2kg PET bottles at BRACU zone with ৳189.00 pending credit)
  const ratePlasticsGood = seededRateMap.get('PLASTICS:GOOD');
  const [existingDeposit1] = await db.select().from(depositRecords).where(eq(depositRecords.session_id, session2.id)).limit(1);
  let deposit1: typeof depositRecords.$inferSelect;
  if (existingDeposit1) {
    deposit1 = existingDeposit1;
  } else {
    const [inserted] = await db
      .insert(depositRecords)
      .values({
        session_id: session2.id,
        zone_id: bracuZone.id,
        user_id: student1User.id,
        category: 'PLASTICS',
        unit: 'kg',
        declared_quantity: '4.20',
        verified_quantity: null,
        evidence_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
        rate_card_entry_id: ratePlasticsGood?.id,
        estimated_bdt: '189.00',
        verified_bdt: null,
        status: 'RECORDED',
      })
      .returning();
    deposit1 = inserted;
  }

  // Deposit 2 (SCENARIO 3: Item E-891 Broken UPS Battery - E-Waste Mandatory Review)
  const rateEwasteGood = seededRateMap.get('E_WASTE:GOOD');
  const [existingDeposit2] = await db.select().from(depositRecords).where(eq(depositRecords.session_id, session3.id)).limit(1);
  let deposit2: typeof depositRecords.$inferSelect;
  if (existingDeposit2) {
    deposit2 = existingDeposit2;
  } else {
    const [inserted] = await db
      .insert(depositRecords)
      .values({
        session_id: session3.id,
        zone_id: buetZone.id,
        user_id: student2User.id,
        category: 'E_WASTE',
        unit: 'piece',
        declared_quantity: '1.00',
        verified_quantity: null,
        evidence_url: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80',
        rate_card_entry_id: rateEwasteGood?.id,
        estimated_bdt: '250.00',
        status: 'ESCALATED',
      })
      .returning();
    deposit2 = inserted;
  }

  // Deposit 3 (SCENARIO 3: Item D-402 Paper pHash Duplicate Image Detection)
  const ratePaperGood = seededRateMap.get('PAPER:GOOD');
  const [existingDeposit3] = await db.select().from(depositRecords).where(eq(depositRecords.session_id, session4.id)).limit(1);
  let deposit3: typeof depositRecords.$inferSelect;
  if (existingDeposit3) {
    deposit3 = existingDeposit3;
  } else {
    const [inserted] = await db
      .insert(depositRecords)
      .values({
        session_id: session4.id,
        zone_id: bracuZone.id,
        user_id: normalUser.id,
        category: 'PAPER',
        unit: 'kg',
        declared_quantity: '15.00',
        verified_quantity: null,
        evidence_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=600&q=80',
        rate_card_entry_id: ratePaperGood?.id,
        estimated_bdt: '375.00',
        status: 'ESCALATED',
      })
      .returning();
    deposit3 = inserted;
  }

  // Deposit 4 (Completed Verified Deposit)
  const [existingDeposit4] = await db.select().from(depositRecords).where(eq(depositRecords.session_id, session5.id)).limit(1);
  let deposit4: typeof depositRecords.$inferSelect;
  if (existingDeposit4) {
    deposit4 = existingDeposit4;
  } else {
    const [inserted] = await db
      .insert(depositRecords)
      .values({
        session_id: session5.id,
        zone_id: bracuZone.id,
        user_id: student1User.id,
        category: 'PLASTICS',
        unit: 'kg',
        declared_quantity: '10.00',
        verified_quantity: '10.00',
        evidence_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
        rate_card_entry_id: ratePlasticsGood?.id,
        estimated_bdt: '450.00',
        verified_bdt: '450.00',
        status: 'VERIFIED',
        divergence_ratio: '0.000',
      })
      .returning();
    deposit4 = inserted;
  }

  // Trust Decisions (Decisions for auto-clear, escalation, and dispute)
  // Decision 1: Auto-clear for Deposit 4
  const [existingDecision1] = await db
    .select()
    .from(trustDecisions)
    .where(and(eq(trustDecisions.subject_type, 'DEPOSIT'), eq(trustDecisions.subject_id, deposit4.id)))
    .limit(1);
  let decision1: typeof trustDecisions.$inferSelect;
  if (existingDecision1) {
    decision1 = existingDecision1;
  } else {
    const [inserted] = await db
      .insert(trustDecisions)
      .values({
        subject_type: 'DEPOSIT',
        subject_id: deposit4.id,
        decision: 'AUTO_CLEAR',
        failing_signals: [],
        evaluated_signals: { in_app_capture: true, hash_unique: true, location_verified: true, category_match: true, quantity_within_band: true },
        decided_by: 'SYSTEM',
        notes: 'Auto-cleared clean deposit',
      })
      .returning();
    decision1 = inserted;
  }

  // Decision 2: Auto-clear for Pickup Order 3
  const [existingDecision2] = await db
    .select()
    .from(trustDecisions)
    .where(and(eq(trustDecisions.subject_type, 'PICKUP'), eq(trustDecisions.subject_id, pickupOrder3.id)))
    .limit(1);
  let decision2: typeof trustDecisions.$inferSelect;
  if (existingDecision2) {
    decision2 = existingDecision2;
  } else {
    const [inserted] = await db
      .insert(trustDecisions)
      .values({
        subject_type: 'PICKUP',
        subject_id: pickupOrder3.id,
        decision: 'AUTO_CLEAR',
        failing_signals: [],
        evaluated_signals: { handover_confirmed: true, in_app_capture: true, quantity_within_band: true },
        decided_by: 'SYSTEM',
      })
      .returning();
    decision2 = inserted;
  }

  // Decision 3: ESCALATE for Item E-891 (Broken UPS Battery)
  const [existingDecision3] = await db
    .select()
    .from(trustDecisions)
    .where(and(eq(trustDecisions.subject_type, 'DEPOSIT'), eq(trustDecisions.subject_id, deposit2.id)))
    .limit(1);
  if (!existingDecision3) {
    await db.insert(trustDecisions).values({
      subject_type: 'DEPOSIT',
      subject_id: deposit2.id,
      decision: 'ESCALATE',
      failing_signals: ['e_waste_mandatory_review'],
      evaluated_signals: { is_ewaste: true, in_app_capture: true, location_verified: true, category_match: true },
      decided_by: 'SYSTEM',
      notes: 'Item E-891: Broken UPS Battery - E-Waste mandatory human review',
    });
  }

  // Decision 4: ESCALATE for Item D-402 (pHash Duplicate Detection)
  const [existingDecision4] = await db
    .select()
    .from(trustDecisions)
    .where(and(eq(trustDecisions.subject_type, 'DEPOSIT'), eq(trustDecisions.subject_id, deposit3.id)))
    .limit(1);
  let decision4: typeof trustDecisions.$inferSelect;
  if (existingDecision4) {
    decision4 = existingDecision4;
  } else {
    const [inserted] = await db
      .insert(trustDecisions)
      .values({
        subject_type: 'DEPOSIT',
        subject_id: deposit3.id,
        decision: 'ESCALATE',
        failing_signals: ['phash_duplicate_image'],
        evaluated_signals: { phash_match: true, hamming_distance: 0, prior_deposit_ref: 'DEP-PREV-091' },
        decided_by: 'SYSTEM',
        notes: 'Item D-402: Paper deposit flagged: [PHASH_DUPLICATE_IMAGE_DETECTED]',
      })
      .returning();
    decision4 = inserted;
  }

  // Fraud Flags
  const [existingFlag1] = await db
    .select()
    .from(fraudFlags)
    .where(and(eq(fraudFlags.entity_id, normalUser.id), eq(fraudFlags.flag_type, 'PHASH_DUPLICATE_IMAGE')))
    .limit(1);
  if (!existingFlag1) {
    await db.insert(fraudFlags).values({
      entity_type: 'USER',
      entity_id: normalUser.id,
      flag_type: 'PHASH_DUPLICATE_IMAGE',
      severity: 'HIGH',
      reason: 'Duplicate photo detected across multiple deposit submissions (pHash distance 0)',
    });
  }

  const [existingFlag2] = await db
    .select()
    .from(fraudFlags)
    .where(and(eq(fraudFlags.entity_id, collector2User.id), eq(fraudFlags.flag_type, 'SUSPICIOUS_VELOCITY')))
    .limit(1);
  if (!existingFlag2) {
    await db.insert(fraudFlags).values({
      entity_type: 'PARTNER',
      entity_id: collector2User.id,
      flag_type: 'SUSPICIOUS_VELOCITY',
      severity: 'LOW',
      reason: 'Unusual pickup confirmation frequency during off-hours',
    });
  }

  // Evidence Hashes
  const [existingHash] = await db.select().from(evidenceHashes).limit(1);
  if (!existingHash) {
    await db.insert(evidenceHashes).values([
      { evidence_url: deposit3.evidence_url, phash_hex: '0f0f0f0f0f0f0f0f', uploader_id: normalUser.id },
      { evidence_url: deposit1.evidence_url, phash_hex: 'ffff0000ffff0000', uploader_id: student1User.id },
    ]);
  }

  // Decision Contest
  const [existingContest] = await db.select().from(decisionContests).where(eq(decisionContests.decision_id, decision4.id)).limit(1);
  if (!existingContest) {
    await db.insert(decisionContests).values({
      decision_id: decision4.id,
      user_id: normalUser.id,
      reason: 'The paper was sorted white office paper; photograph was taken at the bin location.',
      status: 'PENDING',
    });
  }

  // =========================================================================
  // 14. WALLET, REDEMPTION & LIABILITY
  // =========================================================================
  // Liability Caps
  const [existingCap] = await db.select().from(liabilityCaps).limit(1);
  if (!existingCap) {
    await db.insert(liabilityCaps).values({
      monthly_platform_cap_bdt: '500000.00',
      monthly_user_cap_bdt: '25000.00',
      min_redemption_bdt: '300.00',
      fee_percentage: '1.85',
      effective_from: new Date(Date.now() - 30 * 86400_000),
      updated_by: adminOrgUser.id,
    });
  }

  // Credit Txns
  // Txn 1: Student 1 - 450 Verified
  const [existingTxn1] = await db.select().from(creditTxns).where(eq(creditTxns.custody_ref, deposit4.id)).limit(1);
  if (!existingTxn1) {
    await db.insert(creditTxns).values({
      user_id: student1User.id,
      amount: '450.00',
      kind: 'EARN',
      status: 'VERIFIED',
      source_id: 'DEPOSIT',
      custody_ref: deposit4.id,
      trust_decision_id: decision1.id,
      reason: 'Verified drop zone deposit (10kg Plastics)',
    });
  }

  // Txn 2: Student 1 - 189 Pending (SCENARIO 2)
  const [existingTxn2] = await db.select().from(creditTxns).where(eq(creditTxns.custody_ref, deposit1.id)).limit(1);
  if (!existingTxn2) {
    await db.insert(creditTxns).values({
      user_id: student1User.id,
      amount: '189.00',
      kind: 'EARN',
      status: 'PENDING',
      source_id: 'DEPOSIT',
      custody_ref: deposit1.id,
      reason: 'Drop zone deposit pending collector scale confirmation (4.2kg PET bottles)',
    });
  }

  // Txn 3: Student 2 - 850 Verified
  const [existingTxn3] = await db.select().from(creditTxns).where(eq(creditTxns.custody_ref, pickupOrder3.id)).limit(1);
  if (!existingTxn3) {
    await db.insert(creditTxns).values({
      user_id: student2User.id,
      amount: '850.00',
      kind: 'EARN',
      status: 'VERIFIED',
      source_id: 'PICKUP',
      custody_ref: pickupOrder3.id,
      trust_decision_id: decision2.id,
      reason: 'Verified pickup collection (5kg Copper Cables)',
    });
  }

  // Txn 4: Student 1 - 120 Pending extra
  const [existingTxn4] = await db.select().from(creditTxns).where(eq(creditTxns.custody_ref, 'DEP-PENDING-EXTRA-01')).limit(1);
  if (!existingTxn4) {
    await db.insert(creditTxns).values({
      user_id: student1User.id,
      amount: '120.00',
      kind: 'EARN',
      status: 'PENDING',
      source_id: 'DEPOSIT',
      custody_ref: 'DEP-PENDING-EXTRA-01',
      reason: 'Awaiting Trust Gate verification',
    });
  }

  // Txn 5: Student 2 - 500 Redeem
  const [existingTxn5] = await db.select().from(creditTxns).where(eq(creditTxns.custody_ref, 'RED-BKASH-001')).limit(1);
  if (!existingTxn5) {
    await db.insert(creditTxns).values({
      user_id: student2User.id,
      amount: '500.00',
      kind: 'REDEEM',
      status: 'VERIFIED',
      source_id: 'REDEMPTION',
      custody_ref: 'RED-BKASH-001',
      reason: 'bKash cash-out settlement',
    });
  }

  // Txn 6: Student 1 - 50 Adjust Bonus
  const [existingTxn6] = await db.select().from(creditTxns).where(eq(creditTxns.custody_ref, 'ADJUST-BONUS-001')).limit(1);
  if (!existingTxn6) {
    await db.insert(creditTxns).values({
      user_id: student1User.id,
      amount: '50.00',
      kind: 'ADJUST',
      status: 'VERIFIED',
      source_id: 'SYSTEM',
      custody_ref: 'ADJUST-BONUS-001',
      reason: 'First deposit welcome bonus',
    });
  }

  // Redemption Requests & Payout Records
  const [existingRedemption1] = await db
    .select()
    .from(redemptionRequests)
    .where(and(eq(redemptionRequests.user_id, student2User.id), eq(redemptionRequests.status, 'PAID')))
    .limit(1);
  let red1: typeof redemptionRequests.$inferSelect;
  if (existingRedemption1) {
    red1 = existingRedemption1;
  } else {
    const [inserted] = await db
      .insert(redemptionRequests)
      .values({
        user_id: student2User.id,
        amount_credits: '500.00',
        payout_channel: 'BKASH',
        account_number: '01722222222',
        gross_amount_bdt: '500.00',
        fee_bdt: '9.25',
        net_amount_bdt: '490.75',
        status: 'PAID',
      })
      .returning();
    red1 = inserted;

    await db.insert(payoutRecords).values({
      redemption_id: red1.id,
      gateway_ref: 'MFS-BKASH-TXN-984210',
      gateway_provider: 'SSLCOMMERZ_MFS',
      status: 'SUCCESS',
      payload: { provider: 'bKash', msisdn: '01722222222', amount: 490.75, settled_at: new Date().toISOString() },
    });
  }

  const [existingRedemption2] = await db
    .select()
    .from(redemptionRequests)
    .where(and(eq(redemptionRequests.user_id, student1User.id), eq(redemptionRequests.status, 'REQUESTED')))
    .limit(1);
  if (!existingRedemption2) {
    await db.insert(redemptionRequests).values({
      user_id: student1User.id,
      amount_credits: '350.00',
      payout_channel: 'BKASH',
      account_number: '01711111112',
      gross_amount_bdt: '350.00',
      fee_bdt: '6.48',
      net_amount_bdt: '343.52',
      status: 'REQUESTED',
    });
  }

  // =========================================================================
  // 15. ESCROW HOLDS & DISPUTES
  // =========================================================================
  const [existingEscrow] = await db
    .select()
    .from(escrowHolds)
    .where(and(eq(escrowHolds.lot_id, lotEndedSold.id), eq(escrowHolds.buyer_id, recycler1User.id)))
    .limit(1);
  if (existingEscrow) {
    await db
      .update(escrowHolds)
      .set({ inspection_expires_at: new Date(Date.now() + 48 * 3600_000) })
      .where(eq(escrowHolds.id, existingEscrow.id));
  } else {
    await db.insert(escrowHolds).values({
      lot_id: lotEndedSold.id,
      buyer_id: recycler1User.id,
      seller_id: partnerUser.id,
      amount_bdt: '48000.00',
      status: 'HELD',
      inspection_expires_at: new Date(Date.now() + 48 * 3600_000),
    });
  }

  const [existingDispute1] = await db
    .select()
    .from(disputes)
    .where(and(eq(disputes.source_type, 'AUCTION_LOT'), eq(disputes.source_id, lotEndedSold.id)))
    .limit(1);
  if (!existingDispute1) {
    await db.insert(disputes).values({
      source_type: 'AUCTION_LOT',
      source_id: lotEndedSold.id,
      opened_by: recycler1User.id,
      against_user_id: partnerUser.id,
      reason: 'Contaminated scrap received: Lot was graded as clean cullet glass, but contained ~15% ceramic and stone debris.',
      evidence_urls: [
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
      ],
      status: 'OPEN',
    });
  }

  const [existingDispute2] = await db
    .select()
    .from(disputes)
    .where(and(eq(disputes.source_type, 'DEPOSIT'), eq(disputes.source_id, deposit2.id)))
    .limit(1);
  if (!existingDispute2) {
    await db.insert(disputes).values({
      source_type: 'DEPOSIT',
      source_id: deposit2.id,
      opened_by: student1User.id,
      against_user_id: adminOrgUser.id,
      reason: 'Scale reading at BUET bin differed from declared weight.',
      evidence_urls: ['https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80'],
      status: 'RESOLVED',
      resolution: 'UPHELD',
      resolution_notes: 'Collector scale photo verified 10.0kg accurate.',
      resolved_by: adminOrgUser.id,
      resolved_at: new Date(Date.now() - 24 * 3600_000),
    });
  }

  // =========================================================================
  // 16. SCENARIO 6: PARTNER KYC OCR ADJUDICATION WORKLIST
  // =========================================================================
  // Extraction 1 (SCENARIO 6: DoE certificate extraction ready for admin approval)
  const [existingKyc1] = await db
    .select()
    .from(kycExtractions)
    .where(and(eq(kycExtractions.partner_id, partnerApplicant.id), eq(kycExtractions.document_type, 'DOE_EWASTE_PERMIT')))
    .limit(1);
  if (existingKyc1) {
    await db
      .update(kycExtractions)
      .set({
        extracted_expiry_date: new Date(Date.now() + 500 * 86400_000),
        match_status: 'EXACT_MATCH',
        adjudicated_by: null,
      })
      .where(eq(kycExtractions.id, existingKyc1.id));
  } else {
    await db.insert(kycExtractions).values({
      partner_id: partnerApplicant.id,
      document_url: 'https://documents.chokro.org/kyc/bengal-doe-permit-2026.pdf',
      document_type: 'DOE_EWASTE_PERMIT',
      ocr_provider: 'GOOGLE_VISION',
      raw_extracted_text: `GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH
DEPARTMENT OF ENVIRONMENT
E-WASTE MANAGEMENT PERMIT
Certificate No: DOE/E-WASTE/2026/0418
Holder: Bengal Recyclers Ltd
Issue Date: 15-JAN-2026
Expiry Date: 14-JAN-2028
Authorized Facility: Plot 44, Tejgaon I/A, Dhaka`,
      extracted_org_name: 'Bengal Recyclers Ltd',
      extracted_license_number: 'DOE/E-WASTE/2026/0418',
      extracted_expiry_date: new Date(Date.now() + 500 * 86400_000),
      confidence_score: '0.98',
      match_status: 'EXACT_MATCH',
      mismatched_fields: [],
      is_expired: false,
      adjudicated_by: null,
    });
  }

  // Extraction 2 (Flagged extraction with mismatched trade license number)
  const [existingKyc2] = await db
    .select()
    .from(kycExtractions)
    .where(and(eq(kycExtractions.partner_id, partnerCollector2.id), eq(kycExtractions.document_type, 'TRADE_LICENSE')))
    .limit(1);
  if (!existingKyc2) {
    await db.insert(kycExtractions).values({
      partner_id: partnerCollector2.id,
      document_url: 'https://documents.chokro.org/kyc/savar-trade-license.pdf',
      document_type: 'TRADE_LICENSE',
      ocr_provider: 'GOOGLE_VISION',
      raw_extracted_text: `DHAKA NORTH CITY CORPORATION
TRADE LICENSE
License No: TRAD/DNCC/092144/2024
Business: Savar Cargo Logistics`,
      extracted_org_name: 'Savar Cargo Logistics',
      extracted_license_number: 'TRAD/DNCC/092144/2024',
      extracted_expiry_date: new Date(Date.now() + 180 * 86400_000),
      confidence_score: '0.74',
      match_status: 'MISMATCH',
      mismatched_fields: ['extracted_license_number'],
      is_expired: false,
    });
  }

  // Extraction 3 (Verified DoE permit for Dhaka Green Recyclers)
  const [existingKyc3] = await db
    .select()
    .from(kycExtractions)
    .where(and(eq(kycExtractions.partner_id, partnerDhakaRecycler.id), eq(kycExtractions.document_type, 'DOE_EWASTE_PERMIT')))
    .limit(1);
  let kyc3: typeof kycExtractions.$inferSelect;
  if (existingKyc3) {
    kyc3 = existingKyc3;
  } else {
    const [inserted] = await db
      .insert(kycExtractions)
      .values({
        partner_id: partnerDhakaRecycler.id,
        document_url: 'https://documents.chokro.org/kyc/dhaka-green-doe.pdf',
        document_type: 'DOE_EWASTE_PERMIT',
        ocr_provider: 'GOOGLE_VISION',
        extracted_org_name: 'Dhaka Green Recyclers',
        extracted_license_number: 'DOE/E-WASTE/2024/091',
        extracted_expiry_date: new Date(Date.now() + 300 * 86400_000),
        confidence_score: '0.99',
        match_status: 'EXACT_MATCH',
        mismatched_fields: [],
        is_expired: false,
        adjudicated_by: adminOrgUser.id,
        adjudicated_at: new Date(Date.now() - 7 * 86400_000),
        adjudication_notes: 'Verified valid DoE hazardous scrap processing permit #DOE/E-WASTE/2024/091',
      })
      .returning();
    kyc3 = inserted;

    await db.insert(partnerComplianceAudits).values({
      partner_id: partnerDhakaRecycler.id,
      extraction_id: kyc3.id,
      previous_status: 'APPLIED',
      new_status: 'VERIFIED',
      granted_capabilities: { collects: true, buys: true, e_waste_licensed: true },
      actor_id: adminOrgUser.id,
      reason: 'Verified valid DoE hazardous scrap processing permit #DOE/E-WASTE/2024/091',
    });
  }

  // =========================================================================
  // 17. SCENARIO 7: INSTITUTIONAL ESG CERTIFICATES & SPONSORSHIP POOLS
  // =========================================================================
  // Institution Account for BRACU
  const [existingInstAccount] = await db
    .select()
    .from(institutionAccounts)
    .where(eq(institutionAccounts.campus_id, bracuCampus.id))
    .limit(1);
  if (existingInstAccount) {
    await db
      .update(institutionAccounts)
      .set({ total_diverted_kg: '1420.00' })
      .where(eq(institutionAccounts.id, existingInstAccount.id));
  } else {
    await db.insert(institutionAccounts).values({
      campus_id: bracuCampus.id,
      invite_code: 'BRACU2026',
      contact_email: 'sustainability@bracu.ac.bd',
      total_diverted_kg: '1420.00',
    });
  }

  // Sponsorship Pool for BRACU
  const [existingPool] = await db
    .select()
    .from(sponsorshipPools)
    .where(eq(sponsorshipPools.institution_id, bracuCampus.id))
    .limit(1);
  if (!existingPool) {
    await db.insert(sponsorshipPools).values({
      institution_id: bracuCampus.id,
      total_budget_bdt: '100000.00',
      remaining_budget_bdt: '76500.00',
      monthly_draw_cap_bdt: '25000.00',
    });
  }

  // Impact Records totaling 1,420kg (2.45 Tons CO2e avoided)
  const impactSpecs = [
    { custodyType: 'DEPOSIT', custodyId: deposit4.id, cat: 'PLASTICS', path: 'RECYCLE', mass: '520.00', co2e: '754.000' },
    { custodyType: 'DEPOSIT', custodyId: 'CUST-BRACU-IMP-02', cat: 'PAPER', path: 'RECYCLE', mass: '450.00', co2e: '427.500' },
    { custodyType: 'PICKUP', custodyId: 'CUST-BRACU-IMP-03', cat: 'METAL', path: 'RECYCLE', mass: '300.00', co2e: '855.000' },
    { custodyType: 'DEPOSIT', custodyId: 'CUST-BRACU-IMP-04', cat: 'E_WASTE', path: 'RECYCLE', mass: '150.00', co2e: '413.500' },
  ];

  const coveredRecordIds: string[] = [];
  for (const item of impactSpecs) {
    const [existingImpact] = await db
      .select()
      .from(impactRecords)
      .where(eq(impactRecords.custody_id, item.custodyId))
      .limit(1);

    if (existingImpact) {
      coveredRecordIds.push(existingImpact.id);
    } else {
      const [inserted] = await db
        .insert(impactRecords)
        .values({
          custody_type: item.custodyType,
          custody_id: item.custodyId,
          trust_decision_id: decision1.id,
          user_id: student1User.id,
          institution_id: bracuCampus.id,
          category: item.cat,
          next_life_path: item.path,
          mass_kg: item.mass,
          avoided_co2e_kg: item.co2e,
          factor_version: 'v2026.1',
        })
        .returning();
      coveredRecordIds.push(inserted.id);
    }
  }

  // Official Sustainability Certificate (Ref: CERT-BRACU-2026-Q1)
  const [existingCert] = await db
    .select()
    .from(sustainabilityCertificates)
    .where(eq(sustainabilityCertificates.certificate_ref, 'CERT-BRACU-2026-Q1'))
    .limit(1);

  if (existingCert) {
    await db
      .update(sustainabilityCertificates)
      .set({
        period_start: new Date(Date.now() - 90 * 86400_000),
        period_end: new Date(Date.now()),
        total_mass_kg: '1420.00',
        total_co2e_kg: '2450.000',
        covered_record_ids: coveredRecordIds,
        issued_at: new Date(Date.now() - 2 * 86400_000),
      })
      .where(eq(sustainabilityCertificates.id, existingCert.id));
  } else {
    await db.insert(sustainabilityCertificates).values({
      institution_id: bracuCampus.id,
      certificate_ref: 'CERT-BRACU-2026-Q1',
      period_start: new Date(Date.now() - 90 * 86400_000),
      period_end: new Date(Date.now()),
      total_mass_kg: '1420.00',
      total_co2e_kg: '2450.000',
      covered_record_ids: coveredRecordIds,
      signature_hash: 'a7f93b58c42e19d6e4b901fc88e912ab564c78d910ef2356bc0147823f99a812',
      issued_at: new Date(Date.now() - 2 * 86400_000),
    });
  }

  // =========================================================================
  // 18. VALUATION SCANS, CONVERSATIONS, SAVED LISTINGS & EVIDENCE
  // =========================================================================
  const seedScans = [
    {
      userId: student1User.id,
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
      detectedCategory: 'METAL',
      detectedCondition: 'GOOD',
      estimatedQuantity: '40.00',
      unit: 'kg',
      nextLifePath: 'RECYCLE',
      isEwasteHazard: false,
      confidence: '0.96',
      estimatedValueBdt: '28800.00',
      reasoningRationale: 'Pure sorted copper cables stripped from telecommunications wiring.',
      suggestedAction: 'List on Chokro Marketplace or arrange bulk B2B auction.',
    },
    {
      userId: student1User.id,
      imageUrl: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=600&q=80',
      detectedCategory: 'APPLIANCES',
      detectedCondition: 'FAIR',
      estimatedQuantity: '1.00',
      unit: 'piece',
      nextLifePath: 'REPAIR',
      isEwasteHazard: false,
      confidence: '0.94',
      estimatedValueBdt: '1400.00',
      reasoningRationale: 'Microwave oven with functional casing and repairable magnetron.',
      suggestedAction: 'List in repair section or drop off at ElectroFix partner hub.',
    },
    {
      userId: normalUser.id,
      imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
      detectedCategory: 'PLASTICS',
      detectedCondition: 'GOOD',
      estimatedQuantity: '12.50',
      unit: 'kg',
      nextLifePath: 'RECYCLE',
      isEwasteHazard: false,
      confidence: '0.95',
      estimatedValueBdt: '562.50',
      reasoningRationale: 'Clean sorted PET bottles suitable for bottle-to-bottle pelletizing.',
      suggestedAction: 'Drop off at BRACU Building 1 Cafeteria Smart Bin.',
    },
    {
      userId: student2User.id,
      imageUrl: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80',
      detectedCategory: 'E_WASTE',
      detectedCondition: 'GOOD',
      estimatedQuantity: '8.00',
      unit: 'piece',
      nextLifePath: 'RECYCLE',
      isEwasteHazard: true,
      confidence: '0.98',
      estimatedValueBdt: '3200.00',
      reasoningRationale: 'Precious metal circuit boards requiring authorized DoE recycling.',
      suggestedAction: 'Schedule licensed hazardous scrap pickup with Dhaka Green Recyclers.',
    },
  ];

  for (const scan of seedScans) {
    const [existingScan] = await db
      .select()
      .from(valuationScans)
      .where(and(eq(valuationScans.user_id, scan.userId), eq(valuationScans.detected_category, scan.detectedCategory)))
      .limit(1);

    if (!existingScan) {
      await db.insert(valuationScans).values({
        user_id: scan.userId,
        image_url: scan.imageUrl,
        detected_category: scan.detectedCategory,
        detected_condition: scan.detectedCondition,
        estimated_quantity: scan.estimatedQuantity,
        unit: scan.unit,
        next_life_path: scan.nextLifePath,
        is_ewaste_hazard: scan.isEwasteHazard,
        confidence: scan.confidence,
        estimated_value_bdt: scan.estimatedValueBdt,
        reasoning_rationale: scan.reasoningRationale,
        suggested_action: scan.suggestedAction,
      });
    }
  }

  // Conversation & Messages
  const [existingConv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.listing_id, listingCopper40kg.id),
        eq(conversations.buyer_id, buyerFarukUser.id),
        eq(conversations.seller_id, student1User.id)
      )
    )
    .limit(1);

  let conv: typeof conversations.$inferSelect;
  if (existingConv) {
    conv = existingConv;
  } else {
    const [inserted] = await db
      .insert(conversations)
      .values({
        listing_id: listingCopper40kg.id,
        buyer_id: buyerFarukUser.id,
        seller_id: student1User.id,
        last_message_body: 'I have countered with ৳740/kg. Let me know if that works.',
        last_message_at: new Date(Date.now() - 30 * 60_000),
      })
      .returning();
    conv = inserted;

    await db.insert(messages).values([
      { conversation_id: conv.id, sender_id: buyerFarukUser.id, body: 'Salam, is the copper wire sorted and stripped?' },
      { conversation_id: conv.id, sender_id: student1User.id, body: 'Yes, 100% stripped electrolytic grade.' },
      { conversation_id: conv.id, sender_id: student1User.id, body: 'I have countered with ৳740/kg. Let me know if that works.' },
    ]);
  }

  // Saved Listings
  const [existingSaved] = await db
    .select()
    .from(savedListings)
    .where(and(eq(savedListings.user_id, buyerFarukUser.id), eq(savedListings.listing_id, listingCopper40kg.id)))
    .limit(1);
  if (!existingSaved) {
    await db.insert(savedListings).values({
      user_id: buyerFarukUser.id,
      listing_id: listingCopper40kg.id,
    });
  }

  // Evidence Records
  const [existingEv] = await db.select().from(evidenceRecords).limit(1);
  if (!existingEv) {
    await db.insert(evidenceRecords).values([
      {
        uploader_id: student1User.id,
        storage_path: '/uploads/evidence/bracu-deposit-4-2kg.jpg',
        url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
        mime_type: 'image/jpeg',
        byte_size: 245000,
      },
    ]);
  }

  // =========================================================================
  // 19. GAMIFICATION, STREAKS, BADGES & CAMPUS LEADERBOARDS
  // =========================================================================
  // Streaks
  const [existingStreak1] = await db.select().from(userStreaks).where(eq(userStreaks.user_id, student1User.id)).limit(1);
  if (existingStreak1) {
    await db.update(userStreaks).set({ current_streak_days: 6, longest_streak_days: 6, last_active_at: new Date() }).where(eq(userStreaks.id, existingStreak1.id));
  } else {
    await db.insert(userStreaks).values({
      user_id: student1User.id,
      current_streak_days: 6,
      longest_streak_days: 6,
      streak_multiplier: '1.50',
      last_active_at: new Date(),
      leaderboard_opt_out: false,
    });
  }

  const [existingStreak2] = await db.select().from(userStreaks).where(eq(userStreaks.user_id, student2User.id)).limit(1);
  if (existingStreak2) {
    await db.update(userStreaks).set({ current_streak_days: 14, longest_streak_days: 14, last_active_at: new Date() }).where(eq(userStreaks.id, existingStreak2.id));
  } else {
    await db.insert(userStreaks).values({
      user_id: student2User.id,
      current_streak_days: 14,
      longest_streak_days: 14,
      streak_multiplier: '2.00',
      last_active_at: new Date(),
      leaderboard_opt_out: false,
    });
  }

  // Badges
  const badgesToSeed = [
    { userId: student1User.id, badgeType: 'FIRST_VERIFIED_DEPOSIT', awardPoints: '50.00', meta: { campus: 'BRACU', note: 'First verified drop zone deposit' } },
    { userId: student1User.id, badgeType: 'WASTE_10KG', awardPoints: '100.00', meta: { campus: 'BRACU', note: 'Diverted 10kg from landfills' } },
    { userId: student2User.id, badgeType: 'FIRST_VERIFIED_DEPOSIT', awardPoints: '50.00', meta: { campus: 'DU', note: 'First verified recycling deposit' } },
    { userId: student2User.id, badgeType: 'STREAK_7', awardPoints: '150.00', meta: { campus: 'DU', note: '7-day active recycling streak' } },
    { userId: recyclerRahimUser.id, badgeType: 'E_WASTE_STEWARD', awardPoints: '500.00', meta: { note: 'DoE Licensed E-Waste Recycler Champion' } },
  ];

  for (const b of badgesToSeed) {
    const [existingBadge] = await db
      .select()
      .from(badgeAwards)
      .where(and(eq(badgeAwards.user_id, b.userId), eq(badgeAwards.badge_type, b.badgeType)))
      .limit(1);
    if (!existingBadge) {
      await db.insert(badgeAwards).values({
        user_id: b.userId,
        badge_type: b.badgeType,
        award_points: b.awardPoints,
        meta: b.meta,
      });
    }
  }

  // Campus Leaderboards
  const today = new Date().toISOString().slice(0, 10);
  const seedLeaderboards = [
    { period: 'WEEKLY', campus_id: 'BRACU', total_points: '1420.00', member_count: 32, top_scorer_user_id: student1User.id, snapshot_date: today },
    { period: 'WEEKLY', campus_id: 'DU', total_points: '980.00', member_count: 24, top_scorer_user_id: student2User.id, snapshot_date: today },
    { period: 'WEEKLY', campus_id: 'BUET', total_points: '750.00', member_count: 18, top_scorer_user_id: null, snapshot_date: today },
    { period: 'WEEKLY', campus_id: 'NSU', total_points: '620.00', member_count: 15, top_scorer_user_id: adminOrgUser.id, snapshot_date: today },
    { period: 'MONTHLY', campus_id: 'BRACU', total_points: '5680.00', member_count: 85, top_scorer_user_id: student1User.id, snapshot_date: today },
    { period: 'MONTHLY', campus_id: 'DU', total_points: '4120.00', member_count: 62, top_scorer_user_id: student2User.id, snapshot_date: today },
    { period: 'MONTHLY', campus_id: 'BUET', total_points: '3200.00', member_count: 45, top_scorer_user_id: null, snapshot_date: today },
    { period: 'MONTHLY', campus_id: 'NSU', total_points: '2800.00', member_count: 38, top_scorer_user_id: adminOrgUser.id, snapshot_date: today },
    { period: 'ALL_TIME', campus_id: 'BRACU', total_points: '18400.00', member_count: 140, top_scorer_user_id: student1User.id, snapshot_date: today },
    { period: 'ALL_TIME', campus_id: 'DU', total_points: '12900.00', member_count: 110, top_scorer_user_id: student2User.id, snapshot_date: today },
    { period: 'ALL_TIME', campus_id: 'BUET', total_points: '9500.00', member_count: 80, top_scorer_user_id: null, snapshot_date: today },
    { period: 'ALL_TIME', campus_id: 'NSU', total_points: '8100.00', member_count: 75, top_scorer_user_id: adminOrgUser.id, snapshot_date: today },
  ] as const;

  for (const entry of seedLeaderboards) {
    const [existingEntry] = await db
      .select()
      .from(campusLeaderboards)
      .where(and(eq(campusLeaderboards.period, entry.period), eq(campusLeaderboards.campus_id, entry.campus_id)))
      .limit(1);
    if (existingEntry) {
      await db.update(campusLeaderboards).set(entry).where(eq(campusLeaderboards.id, existingEntry.id));
    } else {
      await db.insert(campusLeaderboards).values(entry);
    }
  }

  console.log('✅ Dynamic seed completed successfully with zero empty screens invariant!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
