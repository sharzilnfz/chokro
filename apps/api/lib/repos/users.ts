import { users, memoryStore } from '@chokro/db';
import type { Role } from '@chokro/shared';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { withDb, createRepoSeam } from './seam';

export type UserRecord = Omit<typeof users.$inferSelect, 'role'> & {
  role: Role;
};

export type CreateUserInput = {
  email: string;
  password_hash: string;
  role: Role | string;
  institution_id: string | null;
};

export interface UserRepo {
  findByEmail(email: string): Promise<UserRecord | undefined | null>;
  findById(id: string): Promise<UserRecord | undefined | null>;
  create(data: CreateUserInput): Promise<UserRecord>;
}

export const drizzleUserRepo: UserRepo = {
  async findByEmail(email: string) {
    return withDb(async (db) => ((await db.select().from(users).where(eq(users.email, email)))[0] as UserRecord) ?? null);
  },

  async findById(id: string) {
    return withDb(async (db) => ((await db.select().from(users).where(eq(users.id, id)))[0] as UserRecord) ?? null);
  },

  async create(data: CreateUserInput) {
    return withDb(async (db) => {
      const rows = await db
        .insert(users)
        .values({
          email: data.email,
          password_hash: data.password_hash,
          role: data.role as any,
          institution_id: data.institution_id,
        })
        .returning();
      return rows[0] as UserRecord;
    });
  },
};

export const memoryUserRepo: UserRepo = {
  async findByEmail(email: string) {
    return (memoryStore.users.find((user) => user.email === email) as UserRecord) ?? null;
  },

  async findById(id: string) {
    return (memoryStore.users.find((user) => user.id === id) as UserRecord) ?? null;
  },

  async create(data: CreateUserInput) {
    const user: UserRecord = {
      id: crypto.randomUUID(),
      email: data.email,
      password_hash: data.password_hash,
      role: data.role as Role,
      institution_id: data.institution_id,
      created_at: new Date(),
    };
    memoryStore.users.push(user);
    return user;
  },
};

export const userRepo: UserRepo = createRepoSeam(drizzleUserRepo, memoryUserRepo);
