import { NextResponse } from 'next/server';
import { db, creditTxns, memoryStore } from '@chokro/db';
import { verifyAuthHeader } from '../../../../lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  const payload = verifyAuthHeader(req);
  const userIdHeader = req.headers.get('x-user-id');
  const userId = payload?.userId || userIdHeader || '22222222-2222-2222-2222-222222222222';

  let transactions: any[];
  try {
    transactions = await db.select().from(creditTxns).where(eq(creditTxns.user_id, userId));
  } catch (dbErr) {
    transactions = memoryStore.creditTxns.filter((t) => t.user_id === userId);
  }

  return NextResponse.json({ transactions });
}
