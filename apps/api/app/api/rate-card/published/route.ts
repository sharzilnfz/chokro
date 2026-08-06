import { NextResponse } from 'next/server';
import { db, rateCardEntries, memoryStore } from '@chokro/db';

export async function GET() {
  try {
    let rates: any[];
    try {
      rates = await db.select().from(rateCardEntries);
    } catch (dbErr) {
      rates = memoryStore.rateCardEntries;
    }

    if (rates.length === 0) {
      // Default published rate fallback
      rates = [
        { id: '1', category: 'PLASTICS', condition_band: 'GOOD', unit: 'kg', price_bdt: '45.00', effective_from: new Date().toISOString() },
        { id: '2', category: 'CLOTHES', condition_band: 'FAIR', unit: 'kg', price_bdt: '30.00', effective_from: new Date().toISOString() },
        { id: '3', category: 'E_WASTE', condition_band: 'GOOD', unit: 'piece', price_bdt: '250.00', effective_from: new Date().toISOString() },
      ];
    }

    return NextResponse.json({ rates });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
