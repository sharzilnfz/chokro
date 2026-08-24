// POST /api/handovers/verify-otp — collector submits 6-digit OTP to complete custody handover.
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { HandoverDomain } from '@/lib/domain/HandoverDomain';
import { VerifyOtpSchema } from '@chokro/shared';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = VerifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid OTP verification payload', 400, parsed.error.format());
  }

  const result = await HandoverDomain.verifyOtp({
    taskId: parsed.data.taskId,
    otpCode: parsed.data.otpCode,
    actorUserId: auth.user.userId,
    verifiedQuantity: parsed.data.verifiedQuantity,
    verifiedCondition: parsed.data.verifiedCondition,
    notes: parsed.data.notes,
  });

  return apiSuccess('Custody handover verified successfully', result, 200);
});

export { OPTIONS };
