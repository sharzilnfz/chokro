import { NextResponse } from 'next/server';
import { db, creditTxns, memoryStore } from '@chokro/db';
import { requireAuth } from '../../../../lib/auth';
import { databaseOrTestStore, routeError } from '../../../../lib/database';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req);
    if (auth.response) return auth.response;
    const transactions = await databaseOrTestStore(
      () => db.select().from(creditTxns).where(eq(creditTxns.user_id, auth.user.userId)),
      () => memoryStore.creditTxns.filter((txn) => txn.user_id === auth.user.userId),
    );
    return NextResponse.json({ transactions });
  } catch (error) {
    return routeError(error);
  }
}
