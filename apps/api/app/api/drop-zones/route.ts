// POST /api/drop-zones — admin only. Creates a drop zone.
// GET /api/drop-zones — admin only. Lists all drop zones.
import { requireAdmin } from '../../../lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '../../../lib/http';
import { CreateZoneSchema } from '@chokro/shared';
import { dropZoneRepo } from '../../../lib/repos/dropZones';

// Creates a new drop zone; caller must be an admin.
export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const body = await req.json();
  // Reject payloads that don't satisfy the shared CreateZoneSchema.
  const parsed = CreateZoneSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid drop zone data', 400, parsed.error.format());
  }

  const zone = await dropZoneRepo.create(parsed.data);

  return apiSuccess('Drop zone created', { zone }, 201);
});

// Returns every drop zone, e.g. for admin management.
export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const zones = await dropZoneRepo.findAll();
  return apiData({ zones });
});


