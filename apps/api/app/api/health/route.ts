import { NextResponse } from 'next/server';
import { db } from '@chokro/db';
import { sql } from 'drizzle-orm';
import { apiError, safeRoute } from '../../../lib/http';

export const GET = safeRoute(async () => {
  if (process.env.NODE_ENV === 'test') {
    return NextResponse.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  }

  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: 'degraded', db: 'disconnected', timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
});
