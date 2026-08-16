import { useEffect } from 'react';
import Pusher from 'pusher-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { AuctionLot } from './useAuctionLots';

export type AuctionBid = {
  id: string;
  lot_id: string;
  bid_number: number;
  amount_bdt: number;
  bidder_user_id: string;
  bidder_org_name: string;
  received_at: string;
};

export type AuctionOutcome = {
  sold: boolean;
  winner_org_name?: string;
  final_price_bdt?: number;
  reason?: string;
};

export type AuctionLotDetail = {
  lot: AuctionLot & { seller_org_name: string };
  bids: AuctionBid[];
  outcome: AuctionOutcome | null;
};

type BidPlacedEvent = {
  bid: AuctionBid;
  lot: AuctionLot;
};

/**
 * Live lot detail. Polling (4s) is ALWAYS on — it is the guaranteed fallback —
 * and when EXPO_PUBLIC_PUSHER_KEY/CLUSTER are configured a Pusher subscription
 * updates the query cache instantly on 'bid-placed'.
 */
export function useAuctionLot(lotId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery<AuctionLotDetail>({
    queryKey: ['auction-lot', lotId],
    enabled: lotId != null,
    refetchInterval: 4_000,
    queryFn: () => apiRequest<AuctionLotDetail>(`/api/v1/auction-lots/${lotId}`),
  });

  useEffect(() => {
    const key = process.env.EXPO_PUBLIC_PUSHER_KEY;
    const cluster = process.env.EXPO_PUBLIC_PUSHER_CLUSTER;
    if (!lotId || !key || !cluster) return;

    const pusher = new Pusher(key, { cluster });
    const channel = pusher.subscribe(`auction-lot-${lotId}`);
    channel.bind('bid-placed', (event: BidPlacedEvent) => {
      queryClient.setQueryData<AuctionLotDetail>(['auction-lot', lotId], (prev) =>
        prev == null
          ? prev
          : {
              lot: { ...event.lot, seller_org_name: prev.lot.seller_org_name },
              bids: [event.bid, ...prev.bids.filter((bid) => bid.id !== event.bid.id)].slice(0, 20),
              outcome: prev.outcome,
            },
      );
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`auction-lot-${lotId}`);
      pusher.disconnect();
    };
  }, [lotId, queryClient]);

  return query;
}
