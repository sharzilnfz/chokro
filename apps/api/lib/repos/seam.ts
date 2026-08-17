// seam: wraps every repository query so a missing or failing DB surfaces as a
// DatabaseUnavailableError instead of a raw driver error (fails fast, uniformly).
//
// DB driver instance and the shared unavailability marker.
import { db } from '@chokro/db';
import { DatabaseUnavailableError } from '../database';

// Runs a repo op against the live driver; converts driver failures into the
// DatabaseUnavailableError that route handlers map to HTTP 503.
export async function withDb<T>(op: (dbInstance: typeof db) => Promise<T>): Promise<T> {
  if (!db) {
    throw new DatabaseUnavailableError();
  }
  try {
    return await op(db);
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) throw err;
    if (process.env.NODE_ENV !== 'test') {
      console.error('[withDb error]:', err);
    }
    throw new DatabaseUnavailableError();
  }
}
