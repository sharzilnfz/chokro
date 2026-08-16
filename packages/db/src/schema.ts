import { pgTable, uuid, text, varchar, timestamp, boolean, decimal, jsonb, integer, doublePrecision } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('INDIVIDUAL'), // INDIVIDUAL, PARTNER, ADMIN
  institution_id: varchar('institution_id', { length: 255 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const partners = pgTable('partners', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id),
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
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const listings = pgTable('listings', {
  id: uuid('id').defaultRandom().primaryKey(),
  owner_id: uuid('owner_id').notNull().references(() => users.id),
  category: varchar('category', { length: 50 }).notNull(), // CLOTHES, BOOKS, PLASTICS, etc.
  unit: varchar('unit', { length: 20 }).notNull(), // kg, piece
  declared_weight: decimal('declared_weight', { precision: 10, scale: 2 }),
  piece_count: integer('piece_count'),
  declared_condition: varchar('declared_condition', { length: 50 }).notNull(),
  photos: jsonb('photos').default([]).notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // DRAFT, ACTIVE, CANCELLED
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const rateCardEntries = pgTable('rate_card_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: varchar('category', { length: 50 }).notNull(),
  condition_band: varchar('condition_band', { length: 50 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  price_bdt: decimal('price_bdt', { precision: 10, scale: 2 }).notNull(),
  effective_from: timestamp('effective_from').defaultNow().notNull(),
  updated_by: uuid('updated_by').references(() => users.id),
});

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
  source: varchar('source', { length: 100 }).notNull().default('Metals-API / Commodity Index Feed'),
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

export const auctionBids = pgTable('auction_bids', {
  id: uuid('id').defaultRandom().primaryKey(),
  lot_id: uuid('lot_id').notNull().references(() => auctionLots.id),
  bidder_user_id: uuid('bidder_user_id').notNull().references(() => users.id),
  amount_bdt: decimal('amount_bdt', { precision: 12, scale: 2 }).notNull(),
  // Server-assigned monotonic sequence per lot: a bid only counts if the server accepted it first.
  bid_number: integer('bid_number').notNull(),
  received_at: timestamp('received_at').defaultNow().notNull(),
});

