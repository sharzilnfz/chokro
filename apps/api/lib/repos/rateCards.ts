import { rateCardEntries, memoryStore } from '@chokro/db';
import { getCategoryUnit } from '@chokro/shared';
import crypto from 'crypto';
import { withDb, createRepoSeam } from './seam';

export interface CreateRateCardData {
  category: string;
  conditionBand?: string;
  condition_band?: string;
  unit?: string;
  priceBdt?: number | string;
  price_bdt?: string | number;
  effectiveFrom?: Date;
  effective_from?: Date;
  updatedBy?: string;
  updated_by?: string;
}

export interface RateCardRepo {
  findPublished(): Promise<Array<typeof rateCardEntries.$inferSelect>>;
  findCurrent(): Promise<Array<typeof rateCardEntries.$inferSelect>>;
  create(data: CreateRateCardData): Promise<typeof rateCardEntries.$inferSelect>;
}

function reduceToPublishedRates(rates: any[]): any[] {
  const now = new Date();
  const current = rates
    .filter((entry: any) => new Date(entry.effective_from) <= now)
    .reduce<Record<string, (typeof rates)[number]>>((latest, entry: any) => {
      const key = `${entry.category}|${entry.condition_band}|${entry.unit}`;
      const existing = latest[key];
      if (!existing || new Date(entry.effective_from) > new Date(existing.effective_from)) {
        latest[key] = entry;
      }
      return latest;
    }, {});

  return Object.values(current);
}

export const drizzleRateCardRepo: RateCardRepo = {
  async findPublished() {
    return withDb(async (db) => {
      const rates = await db.select().from(rateCardEntries);
      return reduceToPublishedRates(rates);
    });
  },

  async findCurrent() {
    return withDb(async (db) => db.select().from(rateCardEntries));
  },

  async create(data: CreateRateCardData) {
    const category = data.category;
    const conditionBand = (data.condition_band ?? data.conditionBand)!;
    const unit = data.unit ?? getCategoryUnit(category);
    const priceBdt = (data.price_bdt ?? data.priceBdt ?? 0).toString();
    const effectiveFrom = data.effective_from ?? data.effectiveFrom ?? new Date();
    const updatedBy = data.updated_by ?? data.updatedBy;

    const values = {
      category,
      condition_band: conditionBand,
      unit,
      price_bdt: priceBdt,
      effective_from: effectiveFrom,
      updated_by: updatedBy,
    };

    return withDb(async (db) => {
      const rows = await db.insert(rateCardEntries).values(values).returning();
      return rows[0];
    });
  },
};

export const memoryRateCardRepo: RateCardRepo = {
  async findPublished() {
    return reduceToPublishedRates([...memoryStore.rateCardEntries]);
  },

  async findCurrent() {
    return [...memoryStore.rateCardEntries];
  },

  async create(data: CreateRateCardData) {
    const category = data.category;
    const conditionBand = (data.condition_band ?? data.conditionBand)!;
    const unit = data.unit ?? getCategoryUnit(category);
    const priceBdt = (data.price_bdt ?? data.priceBdt ?? 0).toString();
    const effectiveFrom = data.effective_from ?? data.effectiveFrom ?? new Date();
    const updatedBy = data.updated_by ?? data.updatedBy;

    const values = {
      category,
      condition_band: conditionBand,
      unit,
      price_bdt: priceBdt,
      effective_from: effectiveFrom,
      updated_by: updatedBy,
    };

    const rate = {
      id: crypto.randomUUID(),
      ...values,
    };
    memoryStore.rateCardEntries.push(rate);
    return rate as any;
  },
};

export const rateCardRepo: RateCardRepo = createRepoSeam(drizzleRateCardRepo, memoryRateCardRepo);
