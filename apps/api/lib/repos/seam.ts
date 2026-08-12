import { db } from '@chokro/db';
import { DatabaseUnavailableError } from '../database';

export async function withDb<T>(op: (dbInstance: NonNullable<typeof db>) => Promise<T>): Promise<T> {
  if (!db) {
    throw new DatabaseUnavailableError();
  }
  try {
    return await op(db);
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) throw err;
    throw new DatabaseUnavailableError();
  }
}

export function createRepoSeam<T extends object>(drizzleRepo: T, memoryRepo: T): T {
  return new Proxy(drizzleRepo, {
    get(target, prop: string | symbol) {
      const active = process.env.NODE_ENV === 'test' ? memoryRepo : drizzleRepo;
      const val = (active as any)[prop];
      if (typeof val === 'function') {
        return val.bind(active);
      }
      return val;
    },
  });
}
