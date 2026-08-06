import { NextResponse } from 'next/server';
import { db, creditTxns, memoryStore } from '@chokro/db';
import { requireAuth } from '../../../../lib/auth';
import { databaseOrTestStore, routeError } from '../../../../lib/database';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req);
    if (auth.response) return auth.response;
    const txns = await databaseOrTestStore(
      () => db.select().from(creditTxns).where(eq(creditTxns.user_id, auth.user.userId)),
      () => memoryStore.creditTxns.filter((txn) => txn.user_id === auth.user.userId),
    );

    let verifiedSum = 0;
    let pendingSum = 0;

    for (const txn of txns) {
      const amount = Number(txn.amount);
      if (txn.status === 'VERIFIED') verifiedSum += amount;
      if (txn.status === 'PENDING') pendingSum += amount;
    }

    return NextResponse.json({ balance: { verified: verifiedSum, pending: pendingSum } });
  } catch (error) {
    return routeError(error);
  }
}
