// Chokro database schema: Drizzle table definitions for all core entities.
import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  decimal,
  jsonb,
  integer,
  doublePrecision,
  uniqueIndex,
  date,
} from 'drizzle-orm/pg-core';

// App accounts; the role column gates INDIVIDUAL/PARTNER/ADMIN access
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('INDIVIDUAL'), // INDIVIDUAL, PARTNER, ADMIN
  institution_id: varchar('institution_id', { length: 255 }),
  full_name: varchar('full_name', { length: 120 }),
  phone: varchar('phone', { length: 30 }),
  student_id_doc: text('student_id_doc'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Registered university/college campuses. slug === users.institution_id (leaderboard key).
export const campuses = pgTable('campuses', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  division: varchar('division', { length: 50 }).notNull(), // DivisionEnum
  zilla: varchar('zilla', { length: 120 }).notNull(),
  upazilla: varchar('upazilla', { length: 120 }),
  status: varchar('status', { length: 50 }).default('VERIFIED').notNull(), // VERIFIED, PENDING, BLACKLISTED
  reason: text('reason'), // Notes or blacklisting reason
  created_by: uuid('created_by').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Verified recycling partner organizations, each linked to one user account
export const partners = pgTable('partners', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().unique().references(() => users.id),
  org_name: varchar('org_name', { length: 255 }).notNull(),
  types: jsonb('types').notNull(), // array of types e.g. ["COLLECTOR", "RECYCLER"]
  e_waste_licensed: boolean('e_waste_licensed').default(false).notNull(),
  status: varchar('status', { length: 50 }).default('APPLIED').notNull(), // APPLIED, VERIFIED, REJECTED
  doe_license_doc: text('doe_license_doc'),
  vehicle_label: varchar('vehicle_label', { length: 60 }), // e.g. "Pickup van"
  vehicle_capacity_kg: decimal('vehicle_capacity_kg', { precision: 10, scale: 2 }),
  base_lat: doublePrecision('base_lat'),
  base_lng: doublePrecision('base_lng'),
  service_radius_km: integer('service_radius_km').default(10),
  reason: text('reason'), // admin rejection reason or review note
  capability_flags: jsonb('capability_flags').default({}).notNull(), // { collects, repairs, buys, accepts_donations }
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Items users post for recycling; owned by a user, priced via the rate card
export const listings = pgTable('listings', {
  id: uuid('id').defaultRandom().primaryKey(),
  owner_id: uuid('owner_id').notNull().references(() => users.id),
  category: varchar('category', { length: 50 }).notNull(), // CLOTHES, BOOKS, PLASTICS, etc.
  unit: varchar('unit', { length: 20 }).notNull(), // kg, piece
  declared_weight: decimal('declared_weight', { precision: 10, scale: 2 }),
  piece_count: integer('piece_count'),
  declared_condition: varchar('declared_condition', { length: 50 }).notNull(),
  price_bdt: decimal('price_bdt', { precision: 10, scale: 2 }).notNull(),
  photos: jsonb('photos').default([]).notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // DRAFT, ACTIVE, CANCELLED
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Pricing rules: category + condition band resolve to a BDT price per unit
export const rateCardEntries = pgTable('rate_card_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: varchar('category', { length: 50 }).notNull(),
  condition_band: varchar('condition_band', { length: 50 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  price_bdt: decimal('price_bdt', { precision: 10, scale: 2 }).notNull(),
  effective_from: timestamp('effective_from').$defaultFn(() => new Date()).notNull(),
  updated_by: uuid('updated_by').references(() => users.id),
});

// Physical collection points (e.g. campus bins) accepting specific categories
export const dropZones = pgTable('drop_zones', {
  id: uuid('id').defaultRandom().primaryKey(),
  institution_id: varchar('institution_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  geo_location: jsonb('geo_location'),
  qr_token: text('qr_token').notNull().unique(),
  accepted_categories: jsonb('accepted_categories').notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listing_id: uuid('listing_id').notNull().references(() => listings.id),
    buyer_id: uuid('buyer_id').notNull().references(() => users.id),
    seller_id: uuid('seller_id').notNull().references(() => users.id),
    last_message_body: text('last_message_body'),
    last_message_at: timestamp('last_message_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('conversations_listing_buyer_seller_unique').on(table.listing_id, table.buyer_id, table.seller_id),
  ],
);

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversation_id: uuid('conversation_id').notNull().references(() => conversations.id),
  sender_id: uuid('sender_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const savedListings = pgTable(
  'saved_listings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id').notNull().references(() => users.id),
    listing_id: uuid('listing_id').notNull().references(() => listings.id),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('saved_listings_user_listing_unique').on(table.user_id, table.listing_id)],
);

// Append-only wallet ledger; credit balance derives from EARN/REDEEM/ADJUST rows
export const creditTxns = pgTable('credit_txns', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  kind: varchar('kind', { length: 50 }).notNull(), // EARN, REDEEM, ADJUST
  status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, VERIFIED, REJECTED
  source_id: varchar('source_id', { length: 255 }),
  reason: text('reason'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const rateBenchmarks = pgTable('rate_benchmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: varchar('category', { length: 50 }).notNull().unique(),
  commodity_symbol: varchar('commodity_symbol', { length: 50 }).notNull(),
  global_price_usd: decimal('global_price_usd', { precision: 10, scale: 2 }).notNull(),
  fx_rate_usd_bdt: decimal('fx_rate_usd_bdt', { precision: 10, scale: 2 }).notNull().default('122.50'),
  benchmark_bdt: decimal('benchmark_bdt', { precision: 10, scale: 2 }).notNull(),
  source: varchar('source', { length: 100 }).notNull().default('Open Benchmark / Global Commodity Feed'),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const valuationScans = pgTable('valuation_scans', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id),
  image_url: text('image_url'),
  detected_category: varchar('detected_category', { length: 50 }).notNull(),
  detected_condition: varchar('detected_condition', { length: 50 }).notNull(),
  estimated_quantity: decimal('estimated_quantity', { precision: 10, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  next_life_path: varchar('next_life_path', { length: 50 }).notNull(),
  is_ewaste_hazard: boolean('is_ewaste_hazard').default(false).notNull(),
  confidence: decimal('confidence', { precision: 4, scale: 2 }).notNull(),
  estimated_value_bdt: decimal('estimated_value_bdt', { precision: 10, scale: 2 }).notNull(),
  reasoning_rationale: text('reasoning_rationale').notNull(),
  suggested_action: text('suggested_action'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const pickupOrders = pgTable('pickup_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  listing_id: uuid('listing_id').notNull().references(() => listings.id),
  customer_id: uuid('customer_id').notNull().references(() => users.id),
  collector_partner_id: uuid('collector_partner_id').references(() => partners.id), // null until assigned
  status: varchar('status', { length: 50 }).default('REQUESTED').notNull(), // REQUESTED, ASSIGNED, EN_ROUTE, COLLECTED, CANCELLED
  address: text('address').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  scheduled_for: timestamp('scheduled_for').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const dispatchAssignments = pgTable('dispatch_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  order_id: uuid('order_id').notNull().references(() => pickupOrders.id),
  collector_partner_id: uuid('collector_partner_id').notNull().references(() => partners.id),
  stop_sequence: integer('stop_sequence').notNull(),
  distance_km: decimal('distance_km', { precision: 10, scale: 2 }),
  eta_minutes: integer('eta_minutes'),
  assigned_at: timestamp('assigned_at').defaultNow().notNull(),
});

export const auctionLots = pgTable('auction_lots', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 120 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(), // canonical categories: CLOTHES, BOOKS, PLASTICS, PAPER, METAL, GLASS, FURNITURE, APPLIANCES, E_WASTE
  quantity_kg: decimal('quantity_kg', { precision: 10, scale: 2 }).notNull(),
  starting_price_bdt: decimal('starting_price_bdt', { precision: 12, scale: 2 }).notNull(),
  // SEALED: the seller's reserve price is never serialized to clients — only reserve_met is exposed.
  reserve_price_bdt: decimal('reserve_price_bdt', { precision: 12, scale: 2 }).notNull(),
  origin_label: varchar('origin_label', { length: 160 }),
  status: varchar('status', { length: 30 }).notNull().default('DRAFT'), // DRAFT, LIVE, ENDED, CANCELLED
  opens_at: timestamp('opens_at').notNull(),
  closes_at: timestamp('closes_at').notNull(),
  winning_bid_id: uuid('winning_bid_id'),
  created_by: uuid('created_by').notNull().references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const auctionBids = pgTable(
  'auction_bids',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lot_id: uuid('lot_id').notNull().references(() => auctionLots.id),
    bidder_user_id: uuid('bidder_user_id').notNull().references(() => users.id),
    amount_bdt: decimal('amount_bdt', { precision: 12, scale: 2 }).notNull(),
    // Server-assigned monotonic sequence per lot: a bid only counts if the server accepted it first.
    bid_number: integer('bid_number').notNull(),
    received_at: timestamp('received_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('auction_bids_lot_bid_number_unique').on(table.lot_id, table.bid_number),
  ],
);

// Retrievable stored evidence records for drop-zones, listings, and disputes
export const evidenceRecords = pgTable('evidence_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  uploader_id: uuid('uploader_id').references(() => users.id),
  storage_path: text('storage_path').notNull(),
  url: text('url').notNull(),
  mime_type: varchar('mime_type', { length: 50 }).notNull(),
  byte_size: integer('byte_size').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Engagement streak per user; multiplier applied to leaderboard points.
export const userStreaks = pgTable('user_streaks', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().unique().references(() => users.id),
  current_streak_days: integer('current_streak_days').default(0).notNull(),
  longest_streak_days: integer('longest_streak_days').default(0).notNull(),
  last_active_at: timestamp('last_active_at'),
  streak_multiplier: decimal('streak_multiplier', { precision: 4, scale: 2 }).default('1.00').notNull(),
  leaderboard_opt_out: boolean('leaderboard_opt_out').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Earned milestone badges; one row per (user, badge type) at most.
export const badgeAwards = pgTable('badge_awards', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id),
  badge_type: varchar('badge_type', { length: 50 }).notNull(),
  award_points: decimal('award_points', { precision: 10, scale: 2 }).notNull(),
  meta: jsonb('meta').default({}).notNull(), // proof payload: amount, streak days, rank
  awarded_at: timestamp('awarded_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Materialized per-campus ranking snapshots — never computed on read.
export const campusLeaderboards = pgTable('campus_leaderboards', {
  id: uuid('id').defaultRandom().primaryKey(),
  period: varchar('period', { length: 20 }).notNull(), // WEEKLY, MONTHLY, ALL_TIME
  campus_id: varchar('campus_id', { length: 255 }).notNull(),
  total_points: decimal('total_points', { precision: 12, scale: 2 }).default('0').notNull(),
  member_count: integer('member_count').default(0).notNull(),
  top_scorer_user_id: uuid('top_scorer_user_id').references(() => users.id),
  snapshot_date: date('snapshot_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// KYC Document Extractions & OCR Audit Records (SPEC 15)
export const kycExtractions = pgTable('kyc_extractions', {
  id: uuid('id').defaultRandom().primaryKey(),
  partner_id: uuid('partner_id').notNull().references(() => partners.id),
  document_url: text('document_url').notNull(),
  document_type: varchar('document_type', { length: 50 }).notNull(), // TRADE_LICENSE, DOE_EWASTE_PERMIT, TIN_CERTIFICATE
  ocr_provider: varchar('ocr_provider', { length: 50 }).default('GOOGLE_VISION').notNull(), // GOOGLE_VISION, LOCAL_FALLBACK
  raw_extracted_text: text('raw_extracted_text'),
  extracted_org_name: varchar('extracted_org_name', { length: 255 }),
  extracted_license_number: varchar('extracted_license_number', { length: 100 }),
  extracted_expiry_date: timestamp('extracted_expiry_date'),
  confidence_score: decimal('confidence_score', { precision: 4, scale: 2 }).notNull(), // 0.00 to 1.00
  match_status: varchar('match_status', { length: 50 }).default('PENDING_MATCH').notNull(), // EXACT_MATCH, PARTIAL_MATCH, MISMATCH, EXPIRED
  mismatched_fields: jsonb('mismatched_fields').default([]).notNull(), // string[]
  is_expired: boolean('is_expired').default(false).notNull(),
  adjudicated_by: uuid('adjudicated_by').references(() => users.id),
  adjudicated_at: timestamp('adjudicated_at'),
  adjudication_notes: text('adjudication_notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Partner Compliance Log: records state transitions & capability grants (SPEC 15)
export const partnerComplianceAudits = pgTable('partner_compliance_audits', {
  id: uuid('id').defaultRandom().primaryKey(),
  partner_id: uuid('partner_id').notNull().references(() => partners.id),
  extraction_id: uuid('extraction_id').references(() => kycExtractions.id),
  previous_status: varchar('previous_status', { length: 50 }).notNull(),
  new_status: varchar('new_status', { length: 50 }).notNull(),
  granted_capabilities: jsonb('granted_capabilities').default({}).notNull(),
  actor_id: uuid('actor_id').notNull().references(() => users.id),
  reason: text('reason').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

