import { NextResponse } from 'next/server';
import { db, rateCardEntries, memoryStore } from '@chokro/db';
import { requireAdmin } from '../../../../lib/auth';
import { databaseOrTestStore, routeError } from '../../../../lib/database';
import { CategoryEnum, ConditionEnum } from '@chokro/shared';
import { z } from 'zod';
import crypto from 'crypto';

const RateCardSchema = z.object({
  category: CategoryEnum,
  conditionBand: ConditionEnum,
  priceBdt: z.number().positive(),
});

const categoryUnit = (category: string): 'kg' | 'piece' =>
  category === 'APPLIANCES' || category === 'E_WASTE' ? 'piece' : 'kg';

export async function POST(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const parsed = RateCardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid rate card data', details: parsed.error.format() }, { status: 400 });
    }

    const { category, conditionBand, priceBdt } = parsed.data;
    const values = {
          category,
          condition_band: conditionBand,
          unit: categoryUnit(category),
          price_bdt: priceBdt.toString(),
          effective_from: new Date(),
          updated_by: auth.user.userId,
    };
    const entry = await databaseOrTestStore(
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

    return NextResponse.json({ message: 'Rate card updated', entry }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

export async function GET(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;
    const entries = await databaseOrTestStore(
      () => db.select().from(rateCardEntries),
      () => [...memoryStore.rateCardEntries],
    );
    return NextResponse.json({ entries });
  } catch (error) {
    return routeError(error);
  }
}
