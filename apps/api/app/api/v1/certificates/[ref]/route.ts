// GET /api/v1/certificates/[ref] — public unauthenticated. Resolves ESG certificate for 3rd party audit (M17)
import { apiData, apiError, safeRoute } from '@/lib/http';
import { ImpactDomain } from '@/lib/domain/ImpactDomain';

export const GET = safeRoute(async (req: Request, { params }: { params: Promise<{ ref?: string; id?: string }> }) => {
  const resolved = await params;
  const ref = resolved?.ref || resolved?.id;
  if (!ref) {
    return apiError('Certificate reference is required', 400);
  }

  const certificateView = await ImpactDomain.verifyCertificate(ref);
  return apiData({ certificate: certificateView, ...certificateView });
});

export { OPTIONS } from '@/lib/http';
