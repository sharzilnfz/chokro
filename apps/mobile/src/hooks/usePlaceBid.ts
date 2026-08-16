import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { AuctionBid, AuctionLotDetail } from './useAuctionLot';
import type { AuctionLot } from './useAuctionLots';

export type PlaceBidResult = {
  message: string;
  bid: AuctionBid;
  lot: AuctionLot;
};

export function usePlaceBid() {
  const queryClient = useQueryClient();

  return useMutation<PlaceBidResult, Error, { lotId: string; amount: number }>({
    mutationFn: ({ lotId, amount }) =>
      apiRequest<PlaceBidResult>(`/api/v1/auction-lots/${lotId}/bids`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: (data, variables) => {
      // Fold the accepted bid straight into the cache, then refresh both views.
      queryClient.setQueryData<AuctionLotDetail>(['auction-lot', variables.lotId], (prev) =>
        prev == null
          ? prev
          : {
              lot: { ...data.lot, seller_org_name: prev.lot.seller_org_name },
              bids: [data.bid, ...prev.bids.filter((bid) => bid.id !== data.bid.id)].slice(0, 20),
              outcome: prev.outcome,
            },
      );
      void queryClient.invalidateQueries({ queryKey: ['auction-lot', variables.lotId] });
      void queryClient.invalidateQueries({ queryKey: ['auction-lots'] });
    },
  });
}
