import { apiData, safeRoute } from '@/lib/http';
import { AuctionDomain } from '@/lib/domain/AuctionDomain';

export const GET = safeRoute(async (_req: Request) => {
  const lots = await AuctionDomain.listPublicLots(['LIVE']);
  return apiData({ lots });
});

export { OPTIONS } from '@/lib/http';
