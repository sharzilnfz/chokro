import { NextResponse } from 'next/server';
import { db, users, memoryStore } from '@chokro/db';
import { hashPassword, signToken } from '../../../../lib/auth';
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

    const { email, password, role, institutionId } = parsed.data;
    const password_hash = hashPassword(password);

    let newUser: any;

    try {
      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }

      [newUser] = await db
        .insert(users)
        .values({
          email,
          password_hash,
          role,
          institution_id: institutionId || null,
        })
        .returning();
    } catch (dbErr) {
      // Memory fallback for offline test mode
      const existing = memoryStore.users.find((u) => u.email === email);
      if (existing) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }
      newUser = {
        id: crypto.randomUUID(),
        email,
        password_hash,
        role,
        institution_id: institutionId || null,
        created_at: new Date(),
      };
      memoryStore.users.push(newUser);
    }

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
