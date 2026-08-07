import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '../../../lib/auth';
import { apiError, safeRoute } from '../../../lib/http';
import { CategoryEnum } from '@chokro/shared';
import { dropZoneRepo } from '../../../lib/repos/dropZones';

const CreateZoneSchema = z.object({
  institutionId: z.string().min(1),
  name: z.string().min(1),
  acceptedCategories: z.array(CategoryEnum).min(1),
  geoLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const body = await req.json();
  const parsed = CreateZoneSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid drop zone data', 400, parsed.error.format());
  }

  const zone = await dropZoneRepo.create(parsed.data);

  return NextResponse.json({ message: 'Drop zone created', zone }, { status: 201 });
});

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const zones = await dropZoneRepo.findAll();
  return NextResponse.json({ zones });
});


