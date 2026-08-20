// GET /api/v1/impact/institutions/[id] — public / optional auth. Returns institutional impact metrics
import { apiData, apiError, safeRoute } from '@/lib/http';
import { ImpactDomain } from '@/lib/domain/ImpactDomain';

export const GET = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!id) {
    return apiError('Institution ID or slug is required', 400);
  }

  const url = new URL(req.url);
  const periodStartStr = url.searchParams.get('periodStart');
  const periodEndStr = url.searchParams.get('periodEnd');

  const periodStart = periodStartStr ? new Date(periodStartStr) : undefined;
  const periodEnd = periodEndStr ? new Date(periodEndStr) : undefined;

  const summary = await ImpactDomain.getInstitutionImpact(id, periodStart, periodEnd);
  return apiData({ institutionImpact: summary, ...summary });
});

export { OPTIONS } from '@/lib/http';
