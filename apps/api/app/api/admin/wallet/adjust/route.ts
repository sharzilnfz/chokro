import { NextResponse } from 'next/server';
import { db, creditTxns, memoryStore } from '@chokro/db';
import { z } from 'zod';
import crypto from 'crypto';
import { requireAdmin } from '../../../../../lib/auth';
import { databaseOrTestStore, routeError } from '../../../../../lib/database';

const AdjustSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().finite().refine((amount) => amount !== 0),
  reason: z.string().min(5),
});

export async function POST(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;
    const body = await req.json();
    const parsed = AdjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid adjustment data. Reason is mandatory.', details: parsed.error.format() }, { status: 400 });
    }

    const { userId, amount, reason } = parsed.data;
    const values = {
          user_id: userId,
          amount: amount.toString(),
          kind: 'ADJUST',
          reason,
          status: 'VERIFIED',
    };
    const txn = await databaseOrTestStore(
      async () => (await db.insert(creditTxns).values(values).returning())[0],
      () => {
        const adjustment = {
        id: crypto.randomUUID(),
        ...values,
        created_at: new Date(),
        };
        memoryStore.creditTxns.push(adjustment);
        return adjustment;
      },
    );

    return NextResponse.json({ message: 'Wallet adjusted successfully', txn }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
