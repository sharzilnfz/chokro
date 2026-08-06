import { NextResponse } from 'next/server';
import { db, partners, memoryStore } from '@chokro/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const VerifyPartnerSchema = z.object({
  partnerId: z.string(),
  status: z.enum(['VERIFIED', 'REJECTED']),
});

export async function GET() {
  try {
    let allPartners: any[];
    try {
      allPartners = await db.select().from(partners);
    } catch (dbErr) {
      allPartners = memoryStore.partners;
    }
    return NextResponse.json({ partners: allPartners });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = VerifyPartnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid verification status' }, { status: 400 });
    }

    const { partnerId, status } = parsed.data;
    let partner: any;

    try {
      [partner] = await db.update(partners).set({ status }).where(eq(partners.id, partnerId)).returning();
    } catch (dbErr) {
      partner = memoryStore.partners.find((p) => p.id === partnerId);
      if (partner) partner.status = status;
    }

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    return NextResponse.json({ message: `Partner ${status.toLowerCase()}`, partner });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
