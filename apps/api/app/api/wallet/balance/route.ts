import { NextResponse } from 'next/server';
import { db, creditTxns, memoryStore } from '@chokro/db';
import { verifyAuthHeader } from '../../../../lib/auth';
import { eq, and } from 'drizzle-orm';

export async function GET(req: Request) {
  const payload = verifyAuthHeader(req);
  const userIdHeader = req.headers.get('x-user-id');
  const userId = payload?.userId || userIdHeader || '22222222-2222-2222-2222-222222222222';

  let txns: any[];
  try {
    txns = await db.select().from(creditTxns).where(eq(creditTxns.user_id, userId));
  } catch (dbErr) {
    txns = memoryStore.creditTxns.filter((t) => t.user_id === userId);
  }

  let verifiedSum = 0;
  let pendingSum = 0;

  for (const t of txns) {
    const amt = parseFloat(t.amount || '0');
    if (t.status === 'VERIFIED') {
      verifiedSum += t.kind === 'REDEEM' ? -amt : amt;
    } else if (t.status === 'PENDING') {
      pendingSum += amt;
    }
  }

  return NextResponse.json({
    balance: {
      verified: verifiedSum,
      pending: pendingSum,
    },
  });
}
