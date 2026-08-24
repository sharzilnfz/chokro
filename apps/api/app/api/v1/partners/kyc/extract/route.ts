// POST /api/v1/partners/kyc/extract — Ingests partner license/DoE doc and extracts entities via OCR
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';
import { PartnerKycDomain } from '@/lib/domain/PartnerKycDomain';
import { KycExtractRequestSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = KycExtractRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid KYC extraction request', 400, parsed.error.format());
  }

  try {
    const result = await PartnerKycDomain.extractAndVerify({
      partnerId: parsed.data.partnerId,
      documentUrl: parsed.data.documentUrl,
      documentType: parsed.data.documentType,
      submittedLicenseNumber: parsed.data.submittedLicenseNumber,
      submittedOrgName: parsed.data.submittedOrgName,
      rawDocumentText: parsed.data.rawDocumentText,
      imageBase64: parsed.data.imageBase64,
    });

    return apiData(result, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'KYC extraction failed';
    if (message === 'Partner not found') {
      return apiError(message, 404);
    }
    return apiError(message, 400);
  }
});

export { OPTIONS } from '@/lib/http';
