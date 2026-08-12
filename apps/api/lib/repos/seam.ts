import { db } from '@chokro/db';
import { DatabaseUnavailableError } from '../database';

export async function withDb<T>(op: (dbInstance: typeof db) => Promise<T>): Promise<T> {
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
