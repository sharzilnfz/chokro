import { ReleaseEscrowSchema } from '@chokro/shared';
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute } from '@/lib/http';
import { EscrowDomain } from '@/lib/domain/EscrowDomain';

export const POST = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const { id } = await params;

  let notes: string | undefined;
  try {
    const text = await req.text();
    if (text && text.trim().length > 0) {
      const parsed = ReleaseEscrowSchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        return apiError('Invalid release parameters', 400, parsed.error.format());
      }
      notes = parsed.data.notes;
    }
  } catch {
    // If empty body or non-JSON, notes remains undefined
  }

  const hold = await EscrowDomain.releaseToSeller(
    id,
    { userId: auth.user.userId, role: auth.user.role },
    notes
  );
  return apiSuccess('Escrow funds released to seller', { escrowHold: hold }, 200);
});

export { OPTIONS } from '@/lib/http';
