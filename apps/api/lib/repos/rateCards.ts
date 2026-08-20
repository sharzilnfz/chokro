// rateCards repo: persistence of buy-rate price entries and resolution of the
// single currently-published price per category/condition/unit.
//
// Drizzle rate-card table, category unit default from shared, and the DB seam.
import { db, rateCardEntries, desc, lte, sql } from '@chokro/db';
import { getCategoryUnit } from '@chokro/shared';
import { withDb } from './seam';

// Inferred row type for a single rate-card entry.
export type RateCardEntry = typeof rateCardEntries.$inferSelect;

// Values accepted when publishing a new rate-card entry.
export interface CreateRateCardEntryInput {
  category: string;
  condition_band?: string;
  unit?: string;
  price_bdt?: number | string;
  effective_from?: Date;
  updated_by?: string | null;
}

export const rateCardRepo = {
  // Insert a rate entry, falling back to sensible defaults for condition, unit,
  // price, and effectivity when the caller omits them.
  async createEntry(input: CreateRateCardEntryInput): Promise<RateCardEntry> {
    return withDb(async () => {
      const [entry] = await db
        .insert(rateCardEntries)
        .values({
          category: input.category,
          condition_band: input.condition_band || 'GOOD',
          unit: input.unit || getCategoryUnit(input.category),
          price_bdt: String(input.price_bdt ?? 0),
          effective_from: input.effective_from || new Date(Date.now() - 1000),
          updated_by: input.updated_by || null,
        })
        .returning();
      return entry;
    });
  },

  // Published rate snapshot: entries already effective, newest per category/condition/unit.
  async findPublished(now: Date = new Date()): Promise<RateCardEntry[]> {
    return withDb(async () => {
      const all: RateCardEntry[] = await db
        .select()
        .from(rateCardEntries)
        .where(lte(rateCardEntries.effective_from, now))
        .orderBy(desc(rateCardEntries.effective_from));

      // Keep only the newest effective entry per category/condition/unit triple.
      const seen = new Set<string>();
      const deduplicated: RateCardEntry[] = [];
      for (const entry of all) {
        const key = `${entry.category}:${entry.condition_band}:${entry.unit}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(entry);
        }
      }
      return deduplicated;
    });
  },

  // Full price history (admin inspection), newest first.
  async findAll(): Promise<RateCardEntry[]> {
    return withDb(async () => {
      return db
        .select()
        .from(rateCardEntries)
        .orderBy(desc(rateCardEntries.effective_from));
    });
  },
};