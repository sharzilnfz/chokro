// GET /api/admin/trust-gate/thresholds — admin only. Gets active threshold config and audit history.
// PUT /api/admin/trust-gate/thresholds — admin only. Updates threshold config and records audit log.
import { requireAdmin } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { TrustGateDomain } from '@/lib/domain/TrustGateDomain';
import { trustGateRepo } from '@/lib/repos/trustGate';
import { UpdateThresholdsSchema } from '@chokro/shared';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const { config, configId } = await TrustGateDomain.getEffectiveThresholds();
  const history = await trustGateRepo.getThresholdConfigHistory(50);

  return apiData({
    thresholds: config,
    configId,
    history,
  });
});

export const PUT = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = UpdateThresholdsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid threshold configuration data', 400, parsed.error.format());
  }

  const created = await TrustGateDomain.updateThresholds(parsed.data, auth.user.userId);
  const { config, configId } = await TrustGateDomain.getEffectiveThresholds();

  return apiSuccess('Trust thresholds updated successfully', {
    thresholds: config,
    configId,
    record: created,
  });
});

export { OPTIONS };
