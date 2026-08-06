import { NextResponse } from 'next/server';
import { db, users, memoryStore } from '@chokro/db';
import { comparePassword, signToken } from '../../../../lib/auth';
import { databaseOrTestStore, routeError } from '../../../../lib/database';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const { email, password } = parsed.data;
    const user = await databaseOrTestStore(
      async () => (await db.select().from(users).where(eq(users.email, email)))[0],
      () => memoryStore.users.find((candidate) => candidate.email === email),
    );

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = comparePassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        institutionId: user.institution_id,
      },
      token,
    });
  } catch (error) {
    return routeError(error);
  }
}
