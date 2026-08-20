// POST /api/v1/certificates/generate — auth required. Generates a signed ESG certificate with frozen records
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute } from '@/lib/http';
import { ImpactDomain } from '@/lib/domain/ImpactDomain';
import { GenerateCertificateSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = GenerateCertificateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid certificate generation payload', 400, parsed.error.format());
  }

  const certificate = await ImpactDomain.generateCertificate({
    institutionId: parsed.data.institutionId,
    periodStart: parsed.data.periodStart,
    periodEnd: parsed.data.periodEnd,
  });

  return apiSuccess('Sustainability certificate generated successfully', { certificate }, 201);
});

export { OPTIONS } from '@/lib/http';
