import { NextResponse } from 'next/server';
import { db, dropZones, memoryStore } from '@chokro/db';
import { z } from 'zod';
import crypto from 'crypto';
import { requireAdmin } from '../../../lib/auth';
import { databaseOrTestStore, routeError } from '../../../lib/database';
import { createQrToken } from '../../../lib/qr';
import { CategoryEnum } from '@chokro/shared';

const CreateZoneSchema = z.object({
  institutionId: z.string().min(1),
  name: z.string().min(1),
  acceptedCategories: z.array(CategoryEnum).min(1),
  geoLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

export async function POST(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;
    const body = await req.json();
    const parsed = CreateZoneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid drop zone data', details: parsed.error.format() }, { status: 400 });
    }

    const { institutionId, name, acceptedCategories, geoLocation } = parsed.data;
    const tempId = crypto.randomUUID();
    const qrToken = createQrToken();
    const values = {
          id: tempId,
          institution_id: institutionId,
          name,
          qr_token: qrToken,
          accepted_categories: acceptedCategories,
          geo_location: geoLocation || null,
          status: 'ACTIVE',
    };
    const zone = await databaseOrTestStore(
      async () => (await db.insert(dropZones).values(values).returning())[0],
      () => {
        const dropZone = {
        ...values,
        created_at: new Date(),
        };
        memoryStore.dropZones.push(dropZone);
        return dropZone;
      },
    );

    return NextResponse.json({ message: 'Drop zone created', zone }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

export async function GET(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;
    const zones = await databaseOrTestStore(
      () => db.select().from(dropZones),
      () => [...memoryStore.dropZones],
    );
    return NextResponse.json({ zones });
  } catch (error) {
    return routeError(error);
  }
}
