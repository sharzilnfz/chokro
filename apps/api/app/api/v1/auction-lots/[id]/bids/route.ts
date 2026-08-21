import { PlaceBidSchema } from '@chokro/shared';
import { requireAuth } from '@/lib/auth';
import { apiError, apiSuccess, safeRoute } from '@/lib/http';
import { AuctionDomain } from '@/lib/domain/AuctionDomain';

export const POST = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  if (auth.user.role !== 'PARTNER' && auth.user.role !== 'ADMIN') {
    return apiError('Only B2B partners can bid on auction lots', 403);
  }

  const { id } = await params;

  const parsed = PlaceBidSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError('Invalid bid', 400, parsed.error.format());
  }

  const result = await AuctionDomain.placeBid({
    lotId: id,
    bidderUserId: auth.user.userId,
    amount: parsed.data.amount,
  });
  return apiSuccess('Bid accepted', result, 201);
});

export { OPTIONS } from '@/lib/http';
