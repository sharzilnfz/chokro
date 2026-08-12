import { db, rateCardEntries, memoryStore } from '@chokro/db';
import { getCategoryUnit } from '@chokro/shared';
import crypto from 'crypto';
import { databaseOrTestStore } from '../database';

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

export const rateCardRepo = {
  async findPublished() {
    const now = new Date();
    const rates = await databaseOrTestStore(
      () => db.select().from(rateCardEntries),
      () => [...memoryStore.rateCardEntries],
    );

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
  },

  async findCurrent() {
    return databaseOrTestStore(
      () => db.select().from(rateCardEntries),
      () => [...memoryStore.rateCardEntries],
    );
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

    return databaseOrTestStore(
      async () => (await db.insert(rateCardEntries).values(values).returning())[0],
      () => {
        const rate = {
          id: crypto.randomUUID(),
          ...values,
        };
        memoryStore.rateCardEntries.push(rate);
        return rate;
      },
    );
  },
};
