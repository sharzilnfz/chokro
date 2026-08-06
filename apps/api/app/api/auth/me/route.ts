import { NextResponse } from 'next/server';
import { db, users, memoryStore } from '@chokro/db';
import { verifyAuthHeader } from '../../../../lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  const payload = verifyAuthHeader(req);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let user: any;

  try {
    [user] = await db.select().from(users).where(eq(users.id, payload.userId));
  } catch (dbErr) {
    user = memoryStore.users.find((u) => u.id === payload.userId);
  }

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
}
