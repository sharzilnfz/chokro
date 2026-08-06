import { NextResponse } from 'next/server';
import { db, rateCardEntries, memoryStore } from '@chokro/db';
import { verifyAuthHeader } from '../../../../lib/auth';
import { z } from 'zod';
import crypto from 'crypto';

const RateCardSchema = z.object({
  category: z.string(),
  conditionBand: z.string(),
  unit: z.enum(['kg', 'piece']),
  priceBdt: z.number().positive(),
});

export async function POST(req: Request) {
  try {
    const payload = verifyAuthHeader(req);
    const adminHeader = req.headers.get('x-user-id');
    const updatedBy = payload?.userId || adminHeader || '99999999-9999-9999-9999-999999999999';

    const body = await req.json();
    const parsed = RateCardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid rate card data', details: parsed.error.format() }, { status: 400 });
    }

    const { category, conditionBand, unit, priceBdt } = parsed.data;
    let entry: any;

    try {
      [entry] = await db
        .insert(rateCardEntries)
        .values({
          category,
          condition_band: conditionBand,
          unit,
          price_bdt: priceBdt.toString(),
          effective_from: new Date(),
          updated_by: updatedBy,
        })
        .returning();
    } catch (dbErr) {
      entry = {
        id: crypto.randomUUID(),
        category,
        condition_band: conditionBand,
        unit,
        price_bdt: priceBdt.toString(),
        effective_from: new Date().toISOString(),
        updated_by: updatedBy,
      };
      memoryStore.rateCardEntries.push(entry);
    }

    return NextResponse.json({ message: 'Rate card updated', entry }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    let entries: any[];
    try {
      entries = await db.select().from(rateCardEntries);
    } catch (dbErr) {
      entries = memoryStore.rateCardEntries;
    }
    return NextResponse.json({ entries });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
