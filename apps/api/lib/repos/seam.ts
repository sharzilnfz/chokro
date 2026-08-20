// seam: wraps every repository query so a missing or failing DB surfaces as a
// DatabaseUnavailableError instead of a raw driver error (fails fast, uniformly).
//
// DB driver instance and the shared error markers.
import { db } from '@chokro/db';
import { DatabaseUnavailableError, ConflictError, BadRequestError } from '../database';

// Runs a repo op against the live driver; converts driver failures into specific
// typed domain errors (ConflictError -> 409, BadRequestError -> 400, DatabaseUnavailableError -> 503).
export async function withDb<T>(op: (dbInstance: typeof db) => Promise<T>): Promise<T> {
  if (!db) {
    throw new DatabaseUnavailableError();
  }
  try {
    return await op(db);
  } catch (err: any) {
    if (
      err instanceof ConflictError ||
      err instanceof BadRequestError ||
      err instanceof DatabaseUnavailableError
    ) {
      throw err;
    }
    const code = err?.code || err?.cause?.code || err?.originalError?.code;
    const msg = String(err?.message || '');

    // Postgres / PGlite error 23505 = unique_violation
    if (code === '23505' || msg.includes('unique constraint') || msg.includes('23505') || msg.includes('UNIQUE constraint failed')) {
      throw new ConflictError(msg || 'Unique constraint violation');
    }

    // Postgres / PGlite error 23514 = check_violation, 23502 = not_null_violation
    if (code === '23514' || code === '23502' || msg.includes('check constraint') || msg.includes('not-null constraint')) {
      throw new BadRequestError(msg || 'Database constraint violation');
    }

    if (process.env.NODE_ENV !== 'test') {
      console.error('[withDb error]:', err);
    }
    throw new DatabaseUnavailableError();
  }
}
