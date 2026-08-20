// POST /api/handovers/generate — generates or retrieves active 6-digit handover challenge code for a pickup task.
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { HandoverDomain } from '@/lib/domain/HandoverDomain';
import { GenerateHandoverSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = GenerateHandoverSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid handover challenge payload', 400, parsed.error.format());
  }

  const result = await HandoverDomain.generateHandoverChallenge(
    parsed.data.taskId,
    auth.user.userId
  );

  return apiSuccess('Handover challenge generated successfully', result, 201);
});

export { OPTIONS };
