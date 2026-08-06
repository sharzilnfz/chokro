import { NextResponse } from 'next/server';
import { db, partners, memoryStore } from '@chokro/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/auth';
import { databaseOrTestStore, routeError } from '../../../../lib/database';

const VerifyPartnerSchema = z.object({
  partnerId: z.string(),
  status: z.enum(['VERIFIED', 'REJECTED']),
});

export async function GET(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;
    const allPartners = await databaseOrTestStore(
      () => db.select().from(partners),
      () => [...memoryStore.partners],
    );
    return NextResponse.json({ partners: allPartners });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;
    const body = await req.json();
    const parsed = VerifyPartnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid verification status' }, { status: 400 });
    }

    const { partnerId, status } = parsed.data;
    const existing = await databaseOrTestStore(
      async () => (await db.select().from(partners).where(eq(partners.id, partnerId)))[0],
      () => memoryStore.partners.find((candidate) => candidate.id === partnerId),
    );

    if (!existing) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // SPEC 00 §2.5: the e_waste_licensed capability is granted only by an admin
    // at verification, and only when a DoE license document is on file.
    if (status === 'VERIFIED' && existing.doe_license_doc && !existing.e_waste_licensed) {
      existing.e_waste_licensed = true;
    }

    const partner = await databaseOrTestStore(
      async () => (await db.update(partners).set({
        status,
        e_waste_licensed: existing.e_waste_licensed,
      }).where(eq(partners.id, partnerId)).returning())[0],
      () => {
        existing.status = status;
        return existing;
      },
    );

    return NextResponse.json({ message: `Partner ${status.toLowerCase()}`, partner });
  } catch (error) {
    return routeError(error);
  }
}
