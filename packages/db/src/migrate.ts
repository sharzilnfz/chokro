// Applies database-level invariants that Drizzle schema migrations cannot express.
import { sql } from 'drizzle-orm';
import { db } from './index';

async function migrate() {
  // Backfill the piece_count column added to listings
  await db.execute(sql`alter table listings add column if not exists piece_count integer`);

  // PL/pgSQL trigger function that rejects updates/deletes on credit_txns
  await db.execute(sql`
    create or replace function reject_credit_txn_mutation()
    returns trigger
    language plpgsql
    as $$
    begin
      raise exception 'credit_txns is append-only';
    end;
    $$
  `);

  // Recreate the append-only trigger so the guard is fresh on every boot
  await db.execute(sql`drop trigger if exists credit_txns_append_only on credit_txns`);
  await db.execute(sql`
    create trigger credit_txns_append_only
    before update or delete on credit_txns
    for each row
    execute function reject_credit_txn_mutation()
  `);

  // Ensure all tables exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_streaks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL UNIQUE REFERENCES users(id),
      current_streak_days integer NOT NULL DEFAULT 0,
      longest_streak_days integer NOT NULL DEFAULT 0,
      last_active_at timestamp,
      streak_multiplier decimal(4, 2) NOT NULL DEFAULT '1.00',
      leaderboard_opt_out boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS badge_awards (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id),
      badge_type varchar(50) NOT NULL,
      award_points decimal(10, 2) NOT NULL,
      meta jsonb NOT NULL DEFAULT '{}'::jsonb,
      awarded_at timestamp NOT NULL DEFAULT NOW(),
      created_at timestamp NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS campus_leaderboards (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      period varchar(20) NOT NULL,
      campus_id varchar(255) NOT NULL,
      total_points decimal(12, 2) NOT NULL DEFAULT '0',
      member_count integer NOT NULL DEFAULT 0,
      top_scorer_user_id uuid REFERENCES users(id),
      snapshot_date date NOT NULL,
      created_at timestamp NOT NULL DEFAULT NOW()
    );
  `);

  // Idempotently add new partner columns for rejection reasons and capability flags
  await db.execute(sql`alter table partners add column if not exists reason text`);
  await db.execute(sql`alter table partners add column if not exists capability_flags jsonb default '{}'::jsonb`);

  // Deduplicate any existing partner rows per user before applying unique index (keep verified or latest)
  await db.execute(sql`
    delete from partners a
    using partners b
    where a.user_id = b.user_id
      and a.id <> b.id
      and (
        (a.status <> 'VERIFIED' and b.status = 'VERIFIED')
        or (a.status = b.status and a.created_at < b.created_at)
        or (a.status = b.status and a.created_at = b.created_at and a.id < b.id)
      )
  `);
  await db.execute(sql`create unique index if not exists partners_user_id_uniq on partners (user_id)`);

  // Idempotently add badge_awards proof metadata column and uniqueness invariant
  await db.execute(sql`alter table badge_awards add column if not exists meta jsonb default '{}'::jsonb`);
  await db.execute(sql`create unique index if not exists badge_awards_user_type_uniq on badge_awards (user_id, badge_type)`);

  // Idempotently add user_streaks and campus_leaderboards check constraints
  await db.execute(sql`
    do $$
    begin
      if not exists (
        select 1 from pg_constraint where conname = 'streak_multiplier_range'
      ) then
        alter table user_streaks add constraint streak_multiplier_range check (streak_multiplier >= 1.00 and streak_multiplier <= 2.00);
      end if;
    end;
    $$;
  `);

  await db.execute(sql`
    do $$
    begin
      if not exists (
        select 1 from pg_constraint where conname = 'total_points_nonneg'
      ) then
        alter table campus_leaderboards add constraint total_points_nonneg check (total_points >= 0);
      end if;
    end;
    $$;
  `);

  console.log('Database invariants applied successfully.');
}

migrate().catch((error) => {
  console.error('Database invariant migration failed:', error);
  process.exitCode = 1;
});
