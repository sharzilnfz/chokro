import { NextResponse } from 'next/server';
import { db, dropZones, memoryStore } from '@chokro/db';
import { z } from 'zod';
import crypto from 'crypto';

const CreateZoneSchema = z.object({
  institutionId: z.string(),
  name: z.string(),
  acceptedCategories: z.array(z.string()),
  geoLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

function generateSignedQRToken(zoneId: string, institutionId: string): string {
  const secret = process.env.QR_SECRET || 'chokro-qr-secret-key-2026';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${zoneId}:${institutionId}:${Date.now()}`);
  return `CHOKRO-QR-${hmac.digest('hex').substring(0, 24).toUpperCase()}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateZoneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid drop zone data', details: parsed.error.format() }, { status: 400 });
    }

    const { institutionId, name, acceptedCategories, geoLocation } = parsed.data;
    const tempId = crypto.randomUUID();
    const qrToken = generateSignedQRToken(tempId, institutionId);

    let zone: any;

    try {
      [zone] = await db
        .insert(dropZones)
        .values({
          id: tempId,
          institution_id: institutionId,
          name,
          qr_token: qrToken,
          accepted_categories: acceptedCategories,
          geo_location: geoLocation || null,
          status: 'ACTIVE',
        })
        .returning();
    } catch (dbErr) {
      zone = {
        id: tempId,
        institution_id: institutionId,
        name,
        qr_token: qrToken,
        accepted_categories: acceptedCategories,
        geo_location: geoLocation || null,
        status: 'ACTIVE',
        created_at: new Date(),
      };
      memoryStore.dropZones.push(zone);
    }

    return NextResponse.json({ message: 'Drop zone created', zone }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    let zones: any[];
    try {
      zones = await db.select().from(dropZones);
    } catch (dbErr) {
      zones = memoryStore.dropZones;
    }
    return NextResponse.json({ zones });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
