import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Category } from '@/types';

export type AuctionLotStatus = 'DRAFT' | 'LIVE' | 'ENDED' | 'CANCELLED';

/** Public lot shape — the sealed reserve is never sent by the API. */
export type AuctionLot = {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  quantity_kg: number;
  starting_price_bdt: number;
  origin_label: string | null;
  status: AuctionLotStatus;
  opens_at: string;
  closes_at: string;
  winning_bid_id: string | null;
  created_by: string;
  created_at: string;
  current_price_bdt: number;
  reserve_met: boolean;
  bid_count: number;
};

export function useAuctionLots() {
  return useQuery<AuctionLot[]>({
    queryKey: ['auction-lots'],
    queryFn: () => apiRequest<{ lots: AuctionLot[] }>('/api/v1/auction-lots').then((data) => data.lots),
    // Light refresh so the board (ENDED ribbons, prices) stays honest between visits.
    refetchInterval: 15_000,
  });
}
