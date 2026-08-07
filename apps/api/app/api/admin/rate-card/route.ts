import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { apiError, safeRoute } from '../../../../lib/http';
import { rateCardRepo } from '../../../../lib/repos/rateCards';
import { CategoryEnum, ConditionEnum } from '@chokro/shared';
import { z } from 'zod';

const RateCardSchema = z.object({
  category: CategoryEnum,
  conditionBand: ConditionEnum,
  priceBdt: z.number().positive(),
});

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = RateCardSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid rate card data', 400, parsed.error.format());
  }

  const { category, conditionBand, priceBdt } = parsed.data;
  const entry = await rateCardRepo.create({
    category,
    conditionBand,
    priceBdt,
    updatedBy: auth.user.userId,
  });

  return NextResponse.json({ message: 'Rate card updated', entry }, { status: 201 });
});

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const entries = await rateCardRepo.findCurrent();
  return NextResponse.json({ entries });
});
