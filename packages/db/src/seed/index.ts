// Seed registry: runs the 19 per-scenario modules in order against a shared context.
import { db } from '../index';
import { sql } from 'drizzle-orm';
import { getTableDDLs } from '../ddl';
import type { SeedContext } from './context';
import { run as runCampuses } from './01-campuses';
import { run as runUsers } from './02-users';
import { run as runPartners } from './03-partners';
import { run as runRateCard } from './04-rate-card';
import { run as runBenchmarks } from './05-benchmarks';
import { run as runEmissionFactors } from './06-emission-factors';
import { run as runDropZones } from './07-drop-zones';
import { run as runListings } from './08-listings';
import { run as runDemandMatch } from './09-demand-match';
import { run as runNegotiation } from './10-negotiation';
import { run as runAuctions } from './11-auctions';
import { run as runLogistics } from './12-logistics';
import { run as runTrustGate } from './13-trust-gate';
import { run as runWallet } from './14-wallet';
import { run as runEscrowDisputes } from './15-escrow-disputes';
import { run as runKyc } from './16-kyc';
import { run as runEsg } from './17-esg';
import { run as runEngagement } from './18-engagement';
import { run as runGamification } from './19-gamification';

export type { SeedContext } from './context';

export interface SeedSection {
  name: string;
  run: (ctx: SeedContext) => Promise<void>;
}

export const seedSections: SeedSection[] = [
  { name: 'campuses', run: runCampuses },
  { name: 'users', run: runUsers },
  { name: 'partners', run: runPartners },
  { name: 'rate-card', run: runRateCard },
  { name: 'benchmarks', run: runBenchmarks },
  { name: 'emission-factors', run: runEmissionFactors },
  { name: 'drop-zones', run: runDropZones },
  { name: 'listings', run: runListings },
  { name: 'demand-match', run: runDemandMatch },
  { name: 'negotiation', run: runNegotiation },
  { name: 'auctions', run: runAuctions },
  { name: 'logistics', run: runLogistics },
  { name: 'trust-gate', run: runTrustGate },
  { name: 'wallet', run: runWallet },
  { name: 'escrow-disputes', run: runEscrowDisputes },
  { name: 'kyc', run: runKyc },
  { name: 'esg', run: runEsg },
  { name: 'engagement', run: runEngagement },
  { name: 'gamification', run: runGamification },
];

// Ensure all schema tables exist in the current db backend (generated from the Drizzle schema).
export async function ensureSchema(): Promise<void> {
  // Skip when the schema is already present (mirrors the old IF NOT EXISTS semantics).
  const res: unknown = await db.execute(sql`SELECT to_regclass('public.users') AS reg`);
  const rows: { reg: string | null }[] = Array.isArray(res) ? res : (res as { rows: { reg: string | null }[] }).rows;
  if (rows[0]?.reg != null) return;
  for (const ddl of await getTableDDLs()) {
    await db.execute(sql.raw(ddl));
  }
}

export async function runSeed(): Promise<void> {
  console.log('Seeding Chokro database with dynamic 7-scenario mid-lifecycle matrix...');
  await ensureSchema();

  const ctx: SeedContext = {
    campuses: {} as SeedContext['campuses'],
    users: {} as SeedContext['users'],
    partners: {} as SeedContext['partners'],
    seededRateMap: new Map(),
    zones: {} as SeedContext['zones'],
    listings: {} as SeedContext['listings'],
    lotEndedSold: undefined as unknown as SeedContext['lotEndedSold'],
    pickupOrders: {} as SeedContext['pickupOrders'],
    deposits: {} as SeedContext['deposits'],
    decisions: {} as SeedContext['decisions'],
  };

  for (const section of seedSections) {
    await section.run(ctx);
  }

  console.log('✅ Dynamic seed completed successfully with zero empty screens invariant!');
}
