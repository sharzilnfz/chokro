import { db } from '@chokro/db';
import { sql } from 'drizzle-orm';
import { apiData, safeRoute } from '../../../lib/http';

export const GET = safeRoute(async () => {
  if (process.env.NODE_ENV === 'test') {
    return apiData({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  }

  try {
    await db.execute(sql`select 1`);
    return apiData({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    return apiData(
      { status: 'degraded', db: 'disconnected', timestamp: new Date().toISOString() },
      503,
    );
  }
});
