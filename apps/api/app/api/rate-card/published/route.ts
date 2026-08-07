import { NextResponse } from 'next/server';
import { safeRoute } from '../../../../lib/http';
import { rateCardRepo } from '../../../../lib/repos/rateCards';

export const GET = safeRoute(async () => {
  const rates = await rateCardRepo.findPublished();
  return NextResponse.json({ rates });
});
