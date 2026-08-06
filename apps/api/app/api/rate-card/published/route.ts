import { NextResponse } from 'next/server';
import { db, rateCardEntries, memoryStore } from '@chokro/db';
import { databaseOrTestStore, routeError } from '../../../../lib/database';

export async function GET() {
  try {
    const now = new Date();
    const rates = await databaseOrTestStore(
      () => db.select().from(rateCardEntries),
      () => [...memoryStore.rateCardEntries],
    );

    const current = rates
      .filter((entry) => new Date(entry.effective_from) <= now)
      .reduce<Record<string, (typeof rates)[number]>>((latest, entry) => {
        const key = `${entry.category}|${entry.condition_band}|${entry.unit}`;
        const existing = latest[key];
        if (!existing || new Date(entry.effective_from) > new Date(existing.effective_from)) {
          latest[key] = entry;
        }
        return latest;
      }, {});

    return NextResponse.json({ rates: Object.values(current) });
  } catch (error) {
    return routeError(error);
  }
}
