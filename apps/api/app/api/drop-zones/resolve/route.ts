import { NextResponse } from 'next/server';
import { db, dropZones, memoryStore } from '@chokro/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../../../../lib/auth';
import { databaseOrTestStore, routeError } from '../../../../lib/database';
import { isValidQrToken } from '../../../../lib/qr';

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req);
    if (auth.response) return auth.response;
    const token = new URL(req.url).searchParams.get('token');
    if (!token || !isValidQrToken(token)) {
      return NextResponse.json({ error: 'Invalid drop zone token' }, { status: 400 });
    }

    const zone = await databaseOrTestStore(
      async () => (await db.select().from(dropZones).where(eq(dropZones.qr_token, token)))[0],
      () => memoryStore.dropZones.find((candidate) => candidate.qr_token === token),
    );
    if (!zone) {
      return NextResponse.json({ error: 'Drop zone not found' }, { status: 404 });
    }

    return NextResponse.json({
      zone: {
        name: zone.name,
        status: zone.status,
        acceptedCategories: zone.accepted_categories,
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
