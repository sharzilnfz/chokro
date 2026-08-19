// KeysetPagination: opaque page cursors and the SQL boundary clause for stable,
// scroll-style pagination over timestamp-ordered rows.
//
// Drizzle comparison operators assembling the cursor WHERE clause.
import { lt, eq, and, or } from '@chokro/db';

// Decoded cursor position: createdAt drives ordering, id de-ties equal timestamps.
export interface KeysetCursor {
  createdAt: string;
  id: string;
}

export const KeysetPagination = {
  // Serialize a row position into an opaque, URL-safe base64 cursor.
  encodeCursor(item: { created_at: Date | string; id: string }): string {
    const createdAt = item.created_at instanceof Date ? item.created_at.toISOString() : new Date(item.created_at).toISOString();
    return Buffer.from(JSON.stringify({ createdAt, id: item.id })).toString('base64url');
  },

  // Decode a client-supplied cursor, validating shape and timestamp; returns
  // undefined for anything malformed so callers treat it as a "bad page, empty".
  parseCursor(value: string | null): KeysetCursor | null | undefined {
    if (!value) return null;
    try {
      const parsed = JSON.parse(Buffer.from(value, 'base64url').toString()) as Partial<KeysetCursor>;
      if (typeof parsed.createdAt !== 'string' || Number.isNaN(Date.parse(parsed.createdAt)) || typeof parsed.id !== 'string') {
        return undefined;
      }
      return { createdAt: parsed.createdAt, id: parsed.id };
    } catch {
      return undefined;
    }
  },

  // Build "rows after this position": timestamps before the cursor, or the same
  // instant with an id still below the cursor (the tiebreak).
  buildCursorClause(cursor: KeysetCursor | null | undefined, createdAtColumn: any, idColumn: any) {
    if (!cursor) return null;
    const cursorDate = new Date(cursor.createdAt);
    const cursorTiebreak = and(eq(createdAtColumn, cursorDate), lt(idColumn, cursor.id));
    if (!cursorTiebreak) return null;
    return or(lt(createdAtColumn, cursorDate), cursorTiebreak);
  },
};