import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Category, Unit } from '@/types';
import type {
  NegotiationThreadStatus,
  NegotiationOfferStatus,
} from '@chokro/shared';

export interface NegotiationOffer {
  id: string;
  thread_id: string;
  offered_by_user_id: string;
  offer_amount_bdt: string;
  offered_quantity: string;
  unit: string;
  proposed_pickup_at: string | null;
  notes: string | null;
  status: NegotiationOfferStatus;
  expires_at: string;
  created_at: string;
}

export interface NegotiationThread {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: NegotiationThreadStatus;
  last_offer_id: string | null;
  created_at: string;
  updated_at: string;
  listing: {
    id: string;
    category: Category;
    unit: Unit;
    declared_weight?: string | null;
    piece_count?: number | null;
    declared_condition: string;
    price_bdt: string;
    status: string;
    photos: string[];
    thana?: string | null;
    zilla?: string | null;
  };
  buyer: {
    id: string;
    email: string;
    full_name?: string | null;
    role: string;
  };
  seller: {
    id: string;
    email: string;
    full_name?: string | null;
    role: string;
  };
  offers: NegotiationOffer[];
  active_offer?: NegotiationOffer | null;
}

export function useNegotiationThread(threadId?: string) {
  return useQuery({
    queryKey: ['negotiationThread', threadId],
    queryFn: async () => {
      if (!threadId) throw new Error('No threadId provided');
      const res = await apiRequest<{ thread: NegotiationThread }>(`/api/v1/negotiations/${threadId}`);
      return res.thread;
    },
    enabled: Boolean(threadId),
    refetchInterval: (query) => {
      const thread = query.state.data;
      if (thread && thread.status === 'OPEN') {
        return 3000; // 3-second polling fallback
      }
      return false;
    },
  });
}

export function useNegotiationThreads(status?: string) {
  return useQuery({
    queryKey: ['negotiationThreads', status],
    queryFn: async () => {
      const url = status ? `/api/v1/negotiations?status=${status}` : '/api/v1/negotiations';
      const res = await apiRequest<{ threads: NegotiationThread[] }>(url);
      return res.threads;
    },
  });
}

export function useCreateNegotiationThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      listingId: string;
      initialOfferAmountBdt: number;
      offeredQuantity: number;
      unit?: string;
      proposedPickupAt?: string | null;
      notes?: string | null;
    }) => {
      return apiRequest<{ message: string; thread: NegotiationThread }>('/api/v1/negotiations/threads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['negotiationThreads'] });
    },
  });
}

export function useSubmitCounterOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      threadId,
      offerAmountBdt,
      offeredQuantity,
      unit,
      proposedPickupAt,
      notes,
    }: {
      threadId: string;
      offerAmountBdt: number;
      offeredQuantity: number;
      unit?: string;
      proposedPickupAt?: string | null;
      notes?: string | null;
    }) => {
      return apiRequest<{ message: string; offer: NegotiationOffer }>(`/api/v1/negotiations/${threadId}/offer`, {
        method: 'POST',
        body: JSON.stringify({
          offerAmountBdt,
          offeredQuantity,
          unit,
          proposedPickupAt,
          notes,
        }),
      });
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['negotiationThread', variables.threadId] });
      void queryClient.invalidateQueries({ queryKey: ['negotiationThreads'] });
    },
  });
}

export function useAcceptOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId }: { threadId: string }) => {
      return apiRequest<{ message: string; thread: NegotiationThread; offer: NegotiationOffer; pickupOrder: unknown }>(
        `/api/v1/negotiations/${threadId}/accept`,
        { method: 'POST', body: JSON.stringify({}) },
      );
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['negotiationThread', variables.threadId] });
      void queryClient.invalidateQueries({ queryKey: ['negotiationThreads'] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['pickups'] });
    },
  });
}

export function useRejectOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId, reason }: { threadId: string; reason?: string }) => {
      return apiRequest<{ message: string; offer: NegotiationOffer }>(`/api/v1/negotiations/${threadId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['negotiationThread', variables.threadId] });
      void queryClient.invalidateQueries({ queryKey: ['negotiationThreads'] });
    },
  });
}
