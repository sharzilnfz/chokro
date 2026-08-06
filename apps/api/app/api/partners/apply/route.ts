import { NextResponse } from 'next/server';
import { db, partners, memoryStore } from '@chokro/db';
import { requireAuth } from '../../../../lib/auth';
import { databaseOrTestStore, routeError } from '../../../../lib/database';
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
    const auth = requireAuth(req);
    if (auth.response) return auth.response;

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

    // SPEC 00 §2.5: the e_waste_licensed capability is granted only by an admin
    // during verification, never self-asserted at application time.
    const values = {
          user_id: auth.user.userId,
          org_name: orgName,
          types,
          e_waste_licensed: false,
          doe_license_doc: doeLicenseDoc || null,
          status: 'APPLIED',
    };
    const partner = await databaseOrTestStore(
      async () => (await db.insert(partners).values(values).returning())[0],
      () => {
        const application = {
        id: crypto.randomUUID(),
        ...values,
        created_at: new Date(),
        };
        memoryStore.partners.push(application);
        return application;
      },
    );

    return NextResponse.json({ message: 'Partner application submitted', partner }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
