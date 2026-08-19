// Chokro database schema: Drizzle table definitions for all core entities.
import { pgTable, uuid, text, varchar, timestamp, boolean, decimal, jsonb, integer, uniqueIndex, date } from 'drizzle-orm/pg-core';

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
  effective_from: timestamp('effective_from').defaultNow().notNull(),
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
