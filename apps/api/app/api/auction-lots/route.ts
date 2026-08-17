import { AuctionLotStatusEnum, CreateAuctionLotSchema } from '@chokro/shared';
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { AuctionDomain } from '@/lib/domain/AuctionDomain';

export const GET = safeRoute(async (req: Request) => {
  const statusParam = new URL(req.url).searchParams.get('status');
  let statuses: string[];
  if (statusParam) {
    const parsed = AuctionLotStatusEnum.safeParse(statusParam.toUpperCase());
    if (!parsed.success) {
      return apiError('Invalid status filter', 400, { allowed: AuctionLotStatusEnum.options });
    }
    statuses = [parsed.data];
  } else {
    statuses = ['LIVE', 'ENDED'];
  }

  const lots = await AuctionDomain.listPublicLots(statuses);
  return apiData({ lots });
});

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  if (auth.user.role !== 'PARTNER' && auth.user.role !== 'ADMIN') {
    return apiError('Only B2B partners can post bulk auction lots', 403);
  }

  const parsed = CreateAuctionLotSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError('Invalid auction lot', 400, parsed.error.format());
  }

  const publicLot = await AuctionDomain.createLot({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    category: parsed.data.category,
    quantityKg: parsed.data.quantityKg,
    startingPrice: parsed.data.startingPrice,
    reservePrice: parsed.data.reservePrice,
    originLabel: parsed.data.originLabel ?? null,
    durationMinutes: parsed.data.durationMinutes,
    createdBy: auth.user.userId,
  });

  return apiSuccess('Auction lot posted', { lot: publicLot }, 201);
});

export { OPTIONS } from '@/lib/http';
