import { db, rateCardEntries, desc, lt } from '@chokro/db';
import { withDb } from './seam';

export type RateCardEntry = typeof rateCardEntries.$inferSelect;

export interface CreateRateCardEntryInput {
  category: string;
  conditionBand?: string;
  condition_band?: string;
  unit?: string;
  priceBdt?: number | string;
  price_bdt?: number | string;
  effectiveFrom?: Date;
  effective_from?: Date;
  updatedBy?: string | null;
  updated_by?: string | null;
}

export const rateCardRepo = {
  async createEntry(input: CreateRateCardEntryInput): Promise<RateCardEntry> {
    return withDb(async () => {
      const conditionBand = input.condition_band || input.conditionBand || 'GOOD';
      const priceBdt = input.price_bdt ?? input.priceBdt ?? 0;
      const effectiveFrom = input.effective_from || input.effectiveFrom || new Date();
      const updatedBy = input.updated_by || input.updatedBy || null;
      const unit = input.unit || (['E_WASTE', 'APPLIANCES'].includes(input.category) ? 'piece' : 'kg');

      const [entry] = await db
        .insert(rateCardEntries)
        .values({
          category: input.category,
          condition_band: conditionBand,
          unit,
          price_bdt: String(priceBdt),
          effective_from: effectiveFrom,
          updated_by: updatedBy,
        })
        .returning();
      return entry;
    });
  },

  async create(input: CreateRateCardEntryInput): Promise<RateCardEntry> {
    return this.createEntry(input);
  },

  async findPublishedRates(now: Date = new Date()): Promise<RateCardEntry[]> {
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

  async findPublished(now: Date = new Date()): Promise<RateCardEntry[]> {
    return this.findPublishedRates(now);
  },

  async findAll(): Promise<RateCardEntry[]> {
    return withDb(async () => {
      return db
        .select()
        .from(rateCardEntries)
        .orderBy(desc(rateCardEntries.effective_from));
    });
  },

  async findCurrent(): Promise<RateCardEntry[]> {
    return this.findAll();
  },
};
