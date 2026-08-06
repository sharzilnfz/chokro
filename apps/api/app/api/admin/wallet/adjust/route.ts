import { NextResponse } from 'next/server';
import { db, creditTxns, memoryStore } from '@chokro/db';
import { z } from 'zod';
import crypto from 'crypto';

const AdjustSchema = z.object({
  userId: z.string(),
  amount: z.number(),
  kind: z.enum(['EARN', 'REDEEM', 'ADJUST']),
  reason: z.string().min(5),
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).default('VERIFIED'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = AdjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid adjustment data. Reason is mandatory.', details: parsed.error.format() }, { status: 400 });
    }

    const { userId, amount, kind, reason, status } = parsed.data;

    let txn: any;

    try {
      [txn] = await db
        .insert(creditTxns)
        .values({
          user_id: userId,
          amount: amount.toString(),
          kind,
          reason,
          status,
        })
        .returning();
    } catch (dbErr) {
      txn = {
        id: crypto.randomUUID(),
        user_id: userId,
        amount: amount.toString(),
        kind,
        reason,
        status,
        created_at: new Date(),
      };
      memoryStore.creditTxns.push(txn);
    }

    return NextResponse.json({ message: 'Wallet adjusted successfully', txn }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
