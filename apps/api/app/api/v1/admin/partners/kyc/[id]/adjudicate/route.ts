// POST /api/v1/admin/partners/kyc/[id]/adjudicate — Admin only. Adjudicate KYC extraction & grant capabilities.
import { requireAdmin } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';
import { PartnerKycDomain } from '@/lib/domain/PartnerKycDomain';
import { KycAdjudicateRequestSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = KycAdjudicateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid adjudication payload', 400, parsed.error.format());
  }

  try {
    const result = await PartnerKycDomain.adjudicate({
      extractionId: id,
      adminUserId: auth.user.userId,
      decision: parsed.data.decision,
      notes: parsed.data.notes,
      grantEwasteLicense: parsed.data.grantEwasteLicense,
    });

    return apiData(result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'KYC adjudication failed';
    if (message.includes('not found')) {
      return apiError(message, 404);
    }
    return apiError(message, 400);
  }
});

export { OPTIONS } from '@/lib/http';
