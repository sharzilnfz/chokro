// GET /api/v1/admin/impact/ewaste-compliance — admin only. Generates DoE E-Waste regulatory compliance report
import { requireAdmin } from '@/lib/auth';
import { apiData, safeRoute } from '@/lib/http';
import { ImpactDomain } from '@/lib/domain/ImpactDomain';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const url = new URL(req.url);
  const institutionId = url.searchParams.get('institutionId') || undefined;
  const periodStartStr = url.searchParams.get('periodStart');
  const periodEndStr = url.searchParams.get('periodEnd');

  const periodStart = periodStartStr ? new Date(periodStartStr) : undefined;
  const periodEnd = periodEndStr ? new Date(periodEndStr) : undefined;

  const report = await ImpactDomain.getEwasteComplianceReport(institutionId, periodStart, periodEnd);
  return apiData({ complianceReport: report, ...report });
});

export { OPTIONS } from '@/lib/http';
