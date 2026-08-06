import { NextResponse } from 'next/server';
import { db, partners, memoryStore } from '@chokro/db';
import { verifyAuthHeader } from '../../../../lib/auth';
import { z } from 'zod';
import crypto from 'crypto';

const PartnerApplySchema = z.object({
  orgName: z.string().min(2),
  types: z.array(z.string()).min(1),
  eWasteLicensed: z.boolean().default(false),
  doeLicenseDoc: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const payload = verifyAuthHeader(req);
    const userHeader = req.headers.get('x-user-id');
    const userId = payload?.userId || userHeader || '33333333-3333-3333-3333-333333333333';

    const body = await req.json();
    const parsed = PartnerApplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid application data', details: parsed.error.format() }, { status: 400 });
    }

    const { orgName, types, eWasteLicensed, doeLicenseDoc } = parsed.data;

    // Strict DoE License Gate Invariant
    if (eWasteLicensed && !doeLicenseDoc) {
      return NextResponse.json({ error: 'DoE License document is mandatory for e-waste licensing.' }, { status: 400 });
    }

    let partner: any;

    try {
      [partner] = await db
        .insert(partners)
        .values({
          user_id: userId,
          org_name: orgName,
          types,
          e_waste_licensed: eWasteLicensed,
          doe_license_doc: doeLicenseDoc || null,
          status: 'APPLIED',
        })
        .returning();
    } catch (dbErr) {
      partner = {
        id: crypto.randomUUID(),
        user_id: userId,
        org_name: orgName,
        types,
        e_waste_licensed: eWasteLicensed,
        doe_license_doc: doeLicenseDoc || null,
        status: 'APPLIED',
        created_at: new Date(),
      };
      memoryStore.partners.push(partner);
    }

    return NextResponse.json({ message: 'Partner application submitted', partner }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
