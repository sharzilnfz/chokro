import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/auth';
import { apiError, safeRoute } from '../../../../lib/http';
import { partnerRepo } from '../../../../lib/repos/partners';

const VerifyPartnerSchema = z.object({
  partnerId: z.string(),
  status: z.enum(['VERIFIED', 'REJECTED']),
});

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const allPartners = await partnerRepo.findAll();
  return NextResponse.json({ partners: allPartners });
});

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const body = await req.json();
  const parsed = VerifyPartnerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid verification status', 400);
  }

  const { partnerId, status } = parsed.data;
  const existing = await partnerRepo.findById(partnerId);

  if (!existing) {
    return apiError('Partner not found', 404);
  }

  const partner = await partnerRepo.updateStatusAndLicense(partnerId, status);

  return NextResponse.json({ message: `Partner ${status.toLowerCase()}`, partner });
});
