// GET /api/admin/trust-gate/escalations — admin only. Returns escalated decisions with evidence, signals, and flags (A07)
import { requireAdmin } from '@/lib/auth';
import { apiData, safeRoute, OPTIONS } from '@/lib/http';
import { HandoverDomain } from '@/lib/domain/HandoverDomain';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const escalations = await HandoverDomain.getEscalationWorklist(100);

  return apiData({
    escalations,
    count: escalations.length,
  });
});

export { OPTIONS };
