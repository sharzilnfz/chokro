import { db, rateCardEntries, desc, lt } from '@chokro/db';
import { getCategoryUnit } from '@chokro/shared';
import { withDb } from './seam';

export type RateCardEntry = typeof rateCardEntries.$inferSelect;

export interface CreateRateCardEntryInput {
  category: string;
  condition_band?: string;
  unit?: string;
  price_bdt?: number | string;
  effective_from?: Date;
  updated_by?: string | null;
}

export const rateCardRepo = {
  async createEntry(input: CreateRateCardEntryInput): Promise<RateCardEntry> {
    return withDb(async () => {
      const [entry] = await db
        .insert(rateCardEntries)
        .values({
          category: input.category,
          condition_band: input.condition_band || 'GOOD',
          unit: input.unit || getCategoryUnit(input.category),
          price_bdt: String(input.price_bdt ?? 0),
          effective_from: input.effective_from || new Date(),
          updated_by: input.updated_by || null,
        })
        .returning();
      return entry;
    });
  },

  async findPublished(now: Date = new Date()): Promise<RateCardEntry[]> {
    return withDb(async () => {
      const all: RateCardEntry[] = await db
        .select()
        .from(rateCardEntries)
        .where(lt(rateCardEntries.effective_from, now))
        .orderBy(desc(rateCardEntries.effective_from));

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

  async findAll(): Promise<RateCardEntry[]> {
    return withDb(async () => {
      return db
        .select()
        .from(rateCardEntries)
        .orderBy(desc(rateCardEntries.effective_from));
    });
  },
};