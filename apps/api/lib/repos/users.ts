import { db, users, eq } from '@chokro/db';
import type { Role } from '@chokro/shared';
import { withDb } from './seam';

export type User = typeof users.$inferSelect & {
  role: Role;
};

export interface CreateUserInput {
  email: string;
  password_hash?: string;
  role?: Role;
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
      const [user] = await db
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          password_hash: input.password_hash || '',
          role: input.role || 'INDIVIDUAL',
          institution_id: input.institution_id || null,
        })
        .returning();
      return user as User;
    });
  },
};