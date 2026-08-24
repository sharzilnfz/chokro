// C6 byte-compat proof: seeds the full demo matrix in-process (PGlite), dumps every
// table, normalizes nondeterminism (UUIDs, wall-clock timestamps), and compares
// against a committed fixture. Regenerate with SEED_SNAPSHOT_WRITE=1.
import fs from 'fs';
import path from 'path';
import { db, sql } from '@chokro/db';
import { runSeed } from '@chokro/db/src/seed/index';

const FIXTURE_PATH = path.join(__dirname, '__fixtures__', 'seed-matrix.json');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
// ISO strings from new Date().toISOString(), plus Postgres timestamp text forms.
const DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

let realT0 = 0;
let BASE = 0;
const realDateNow = Date.now;

function rowsOf(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  return (res as { rows: Record<string, unknown>[] }).rows ?? [];
}

function normalizeValue(value: unknown, uuidMap: Map<string, string>): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return normalizeTimestamp(value.getTime());
  if (typeof value === 'string') {
    // bcrypt salts are random per run — the hash of the same demo password is not stable.
    if (value.startsWith('$2b$')) return 'BCRYPT_HASH';
    if (UUID_RE.test(value)) {
      let placeholder = uuidMap.get(value);
      if (!placeholder) {
        placeholder = `#${uuidMap.size + 1}`;
        uuidMap.set(value, placeholder);
      }
      return placeholder;
    }
    if (DATE_ONLY_RE.test(value)) {
      const today = new Date(realT0).toISOString().slice(0, 10);
      return value === today ? 'TODAY' : value;
    }
    if (DATETIME_RE.test(value)) {
      const ms = Date.parse(value);
      if (!Number.isNaN(ms)) return normalizeTimestamp(ms);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => normalizeValue(v, uuidMap));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalizeValue(v, uuidMap)])
    );
  }
  return value;
}

function normalizeTimestamp(ms: number): string | number {
  // DB-side NOW() defaults land within seconds of the un-patched start time.
  if (Math.abs(ms - realT0) < 5 * 60 * 1000) return 'NOW';
  // Relative offsets stay deterministic because Date.now() arithmetic is patched.
  return Math.round((ms - BASE) / 60000);
}

async function dumpAllTables(): Promise<Record<string, unknown>> {
  const tablesRes = rowsOf(
    await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`
    )
  );
  const uuidMap = new Map<string, string>();
  const dump: Record<string, unknown> = {};
  for (const tableName of tablesRes.map((r) => (r as { table_name: string }).table_name)) {
    const rows = rowsOf(await db.execute(sql.raw(`SELECT * FROM "${tableName}"`)));
    const normalized = rows
      .map((row) =>
        Object.fromEntries(Object.entries(row).map(([k, v]) => [k, normalizeValue(v, uuidMap)]))
      )
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    dump[tableName] = normalized;
  }
  return dump;
}

describe('seed matrix snapshot (byte-compat)', () => {
  beforeAll(async () => {
    realT0 = realDateNow();
    BASE = realT0;
    Date.now = () => BASE;
    await runSeed();
  });

  afterAll(() => {
    Date.now = realDateNow;
  });

  it('produces the exact seeded database state', async () => {
    const dump = await dumpAllTables();

    if (process.env.SEED_SNAPSHOT_WRITE === '1') {
      fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
      fs.writeFileSync(FIXTURE_PATH, JSON.stringify(dump, null, 2) + '\n');
      console.log(`seed-matrix fixture written: ${FIXTURE_PATH}`);
      return;
    }

    expect(fs.existsSync(FIXTURE_PATH)).toBe(true);
    const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
    expect(dump).toStrictEqual(fixture);
  });
});
