// POST /api/drop-zones/[id]/empty — auth required. Collector records scale readings and empties bin.
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute } from '@/lib/http';
import { ZoneEmptyingDomain } from '@/lib/domain/ZoneEmptyingDomain';
import { partnerRepo } from '@/lib/repos/partners';
import { EmptyZoneSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = EmptyZoneSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid scale readings payload', 400, parsed.error.format());
  }

  let collectorPartnerId: string | null = null;
  if (auth.user.role === 'PARTNER') {
    const partner = await partnerRepo.findByUserId(auth.user.userId);
    collectorPartnerId = partner?.id || null;
  }

  const result = await ZoneEmptyingDomain.emptyZone({
    zoneId: id,
    collectorPartnerId,
    scaleReadings: parsed.data.scaleReadings,
    evidenceUrl: parsed.data.evidenceUrl,
  });

  return apiSuccess('Drop zone emptied and deposits verified', result, 200);
});
export { OPTIONS } from '@/lib/http';
