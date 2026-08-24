// POST /api/drop-zones/{id}/telemetry — records telemetry snapshot and checks automated dispatch trigger.
import { requireAdmin } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';
import { DropZoneTelemetryDomain } from '@/lib/domain/DropZoneTelemetryDomain';
import { ZoneTelemetrySchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const { id } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = ZoneTelemetrySchema.safeParse(raw);
  if (!parsed.success) {
    return apiError('Invalid telemetry payload: currentFillKg (non-negative number) is required', 400);
  }

  try {
    const result = await DropZoneTelemetryDomain.recordTelemetry({
      zoneId: id,
      currentFillKg: parsed.data.currentFillKg,
      triggerReason: parsed.data.triggerReason,
    });
    return apiData(result, 201);
  } catch (err: any) {
    if (err?.message?.includes('not found')) {
      return apiError('Drop zone not found', 404);
    }
    return apiError(err?.message || 'Failed to record telemetry', 500);
  }
});
export { OPTIONS } from '@/lib/http';
