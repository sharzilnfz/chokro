import { AuctionLotStatusEnum, CreateAuctionLotSchema } from '@chokro/shared';
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, apiSuccess, safeRoute } from '@/lib/http';
import { AuctionDomain } from '@/lib/domain/AuctionDomain';
import { auctionRepo } from '@/lib/repos/auctions';

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
    // Default board: everything still open plus everything already decided.
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

  // Demo simplicity: a posted lot goes LIVE immediately (opens_at = now);
  // DRAFT is reserved for future scheduled openings.
  const now = new Date();
  const lot = await auctionRepo.createLot({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    category: parsed.data.category,
    quantity_kg: parsed.data.quantityKg.toFixed(2),
    starting_price_bdt: parsed.data.startingPrice.toFixed(2),
    reserve_price_bdt: parsed.data.reservePrice.toFixed(2),
    origin_label: parsed.data.originLabel ?? null,
    status: 'LIVE',
    opens_at: now,
    closes_at: new Date(now.getTime() + parsed.data.durationMinutes * 60_000),
    created_by: auth.user.userId,
  });

  return apiSuccess('Auction lot posted', { lot: AuctionDomain.toPublicLot(lot, null, 0) }, 201);
});

export { OPTIONS } from '@/lib/http';
