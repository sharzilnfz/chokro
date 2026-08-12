import { db, users, eq } from '@chokro/db';
import type { Role } from '@chokro/shared';
import { withDb } from './seam';

export type { Role };

export type User = typeof users.$inferSelect & {
  role: Role;
};

export interface CreateUserInput {
  email: string;
  passwordHash?: string;
  password_hash?: string;
  role?: Role;
  institutionId?: string | null;
  institution_id?: string | null;
}

export const userRepo = {
  async findByEmail(email: string): Promise<User | null> {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      return (rows[0] as User) || null;
    });
  },

  async findById(id: string): Promise<User | null> {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return (rows[0] as User) || null;
    });
  },

  async create(input: CreateUserInput): Promise<User> {
    return withDb(async () => {
      const passwordHash = input.password_hash || input.passwordHash || '';
      const institutionId = input.institution_id || input.institutionId || null;
      const [user] = await db
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          password_hash: passwordHash,
          role: input.role || 'INDIVIDUAL',
          institution_id: institutionId,
        })
        .returning();
      return user as User;
    });
  },
};
