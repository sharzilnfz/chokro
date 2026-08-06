import { sql } from 'drizzle-orm';
import { db } from './index';

async function migrate() {
  await db.execute(sql`alter table listings add column if not exists piece_count integer`);
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
  await db.execute(sql`drop trigger if exists credit_txns_append_only on credit_txns`);
  await db.execute(sql`
    create trigger credit_txns_append_only
    before update or delete on credit_txns
    for each row
    execute function reject_credit_txn_mutation()
  `);
  console.log('Database invariants applied successfully.');
}

migrate().catch((error) => {
  console.error('Database invariant migration failed:', error);
  process.exitCode = 1;
});
