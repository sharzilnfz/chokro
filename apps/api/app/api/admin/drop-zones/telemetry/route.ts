// GET /api/admin/drop-zones/telemetry — admin overview of drop zone telemetry, capacity levels, and alerts.
import { requireAdmin } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';
import { DropZoneTelemetryDomain } from '@/lib/domain/DropZoneTelemetryDomain';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  try {
    const overview = await DropZoneTelemetryDomain.getAdminTelemetryOverview();
    return apiData(overview);
  } catch (err: any) {
    return apiError(err?.message || 'Failed to fetch admin telemetry overview', 500);
  }
});
