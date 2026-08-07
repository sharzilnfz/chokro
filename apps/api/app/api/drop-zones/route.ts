import { requireAdmin } from '../../../lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '../../../lib/http';
import { CreateZoneSchema } from '@chokro/shared';
import { dropZoneRepo } from '../../../lib/repos/dropZones';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const body = await req.json();
  const parsed = CreateZoneSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid drop zone data', 400, parsed.error.format());
  }

  const zone = await dropZoneRepo.create(parsed.data);

  return apiSuccess('Drop zone created', { zone }, 201);
});

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const zones = await dropZoneRepo.findAll();
  return apiData({ zones });
});


