import { db, users, memoryStore } from '@chokro/db';
import { databaseOrTestStore } from '../database';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export type CreateUserInput = {
  email: string;
  password_hash: string;
  role: string;
  institution_id: string | null;
};

export const userRepo = {
  async findByEmail(email: string) {
    return databaseOrTestStore(
      async () => (await db.select().from(users).where(eq(users.email, email)))[0],
      () => memoryStore.users.find((user) => user.email === email),
    );
  },

  async findById(id: string) {
    return databaseOrTestStore(
      async () => (await db.select().from(users).where(eq(users.id, id)))[0],
      () => memoryStore.users.find((user) => user.id === id),
    );
  },

  async create(data: CreateUserInput) {
    return databaseOrTestStore(
      async () =>
        (
          await db
            .insert(users)
            .values({
              email: data.email,
              password_hash: data.password_hash,
              role: data.role as any,
              institution_id: data.institution_id,
            })
            .returning()
        )[0],
      () => {
        const user = {
          id: crypto.randomUUID(),
          email: data.email,
          password_hash: data.password_hash,
          role: data.role as any,
          institution_id: data.institution_id,
          created_at: new Date(),
        };
        memoryStore.users.push(user);
        return user;
      },
    );
  },
};
