import { lt, eq, and, or } from '@chokro/db';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

export interface KeysetCursor {
  createdAt: string;
  id: string;
}

export const KeysetPagination = {
  encodeCursor(item: { created_at: Date | string; id: string }): string {
    const createdAt = item.created_at instanceof Date ? item.created_at.toISOString() : new Date(item.created_at).toISOString();
    return Buffer.from(JSON.stringify({ createdAt, id: item.id })).toString('base64url');
  },

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

  buildCursorClause(cursor: KeysetCursor | null | undefined, createdAtColumn: AnyPgColumn, idColumn: AnyPgColumn) {
    if (!cursor) return null;
    const cursorDate = new Date(cursor.createdAt);
    const cursorTiebreak = and(eq(createdAtColumn, cursorDate), lt(idColumn, cursor.id));
    if (!cursorTiebreak) return null;
    return or(lt(createdAtColumn, cursorDate), cursorTiebreak);
  },
};