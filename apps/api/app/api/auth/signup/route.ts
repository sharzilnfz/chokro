import { NextResponse } from 'next/server';
import { db, users, memoryStore } from '@chokro/db';
import { hashPassword, signToken } from '../../../../lib/auth';
import { databaseOrTestStore, routeError } from '../../../../lib/database';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['INDIVIDUAL', 'PARTNER', 'ADMIN']).default('INDIVIDUAL'),
  institutionId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { email, password, institutionId } = parsed.data;
    const password_hash = hashPassword(password);
    const existing = await databaseOrTestStore(
      async () => (await db.select().from(users).where(eq(users.email, email)))[0],
      () => memoryStore.users.find((user) => user.email === email),
    );
    if (existing) {
      return NextResponse.json({ error: 'Unable to create account' }, { status: 400 });
    }

    const newUser = await databaseOrTestStore(
      async () => (await db.insert(users).values({
        email,
        password_hash,
        role: 'INDIVIDUAL',
        institution_id: institutionId || null,
      }).returning())[0],
      () => {
        const user = {
          id: crypto.randomUUID(),
          email,
          password_hash,
          role: 'INDIVIDUAL' as const,
          institution_id: institutionId || null,
          created_at: new Date(),
        };
        memoryStore.users.push(user);
        return user;
      },
    );

    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return NextResponse.json(
      {
        message: 'Signup successful',
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          institutionId: newUser.institution_id,
        },
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    return routeError(error);
  }
}
