import { NextResponse } from 'next/server';
import { db, users, memoryStore } from '@chokro/db';
import { requireAuth } from '../../../../lib/auth';
import { databaseOrTestStore, routeError } from '../../../../lib/database';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req);
    if (auth.response) return auth.response;

    const user = await databaseOrTestStore(
      async () => (await db.select().from(users).where(eq(users.id, auth.user.userId)))[0],
      () => memoryStore.users.find((candidate) => candidate.id === auth.user.userId),
    );

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        institutionId: user.institution_id,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
