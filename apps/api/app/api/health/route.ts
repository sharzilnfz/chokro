// GET /api/health — public. Liveness probe that also checks database connectivity.
import { db } from '@chokro/db';
import { sql } from 'drizzle-orm';
import { apiData, safeRoute } from '../../../lib/http';

// Reports service health; a failed DB probe degrades the status to a 503.
export const GET = safeRoute(async () => {
  // In tests the DB may be absent, so report connected without probing it.
  if (process.env.NODE_ENV === 'test') {
    return apiData({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  }

  // Probe the DB with a trivial query to surface real connectivity.
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
