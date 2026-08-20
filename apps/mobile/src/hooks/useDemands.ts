import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Category } from '@/types';

export interface Demand {
  id: string;
  buyer_id: string;
  category: Category;
  min_quantity: string;
  max_quantity?: string | null;
  unit: 'kg' | 'piece';
  max_price_per_unit_bdt: string;
  target_thana?: string | null;
  target_lat?: number | null;
  target_lng?: number | null;
  max_radius_km: number;
  status: 'ACTIVE' | 'PAUSED' | 'FULFILLED' | 'EXPIRED';
  expires_at: string;
  created_at: string;
}

export interface DemandMatch {
  id: string;
  demand_id: string;
  listing_id: string;
  match_score: string;
  distance_km?: string | null;
  notification_sent: boolean;
  status: 'UNNOTICED' | 'VIEWED' | 'OFFERED' | 'DECLINED';
  created_at: string;
  listing: {
    id: string;
    category: Category;
    unit: 'kg' | 'piece';
    declared_weight?: string | null;
    piece_count?: number | null;
    declared_condition: string;
    price_bdt: string;
    photos: string[];
    status: string;
    lat?: number | null;
    lng?: number | null;
    thana?: string | null;
    seller_email?: string | null;
  };
  demand: {
    id: string;
    category: Category;
    min_quantity: string;
    max_quantity?: string | null;
    unit: string;
    max_price_per_unit_bdt: string;
    target_thana?: string | null;
  };
}

export function useDemands(status?: string) {
  return useQuery({
    queryKey: ['demands', status],
    queryFn: async () => {
      const url = status ? `/api/v1/demands?status=${status}` : '/api/v1/demands';
      const res = await apiRequest<{ demands: Demand[] }>(url);
      return res.demands;
    },
  });
}

export function useDemandMatches(demandId?: string, status?: string) {
  return useQuery({
    queryKey: ['demandMatches', demandId, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (demandId) params.set('demandId', demandId);
      if (status) params.set('status', status);
      const res = await apiRequest<{ matches: DemandMatch[] }>(`/api/v1/demands/matches?${params.toString()}`);
      return res.matches;
    },
  });
}

export function useCreateDemand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      category: Category;
      minQuantity: number;
      maxQuantity?: number | null;
      unit: 'kg' | 'piece';
      maxPricePerUnitBdt: number;
      targetThana?: string | null;
      targetLat?: number | null;
      targetLng?: number | null;
      maxRadiusKm?: number;
      durationDays?: number;
    }) => {
      return apiRequest<{ demand: Demand }>('/api/v1/demands', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    },
  });
}

export function useUpdateMatchStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, status }: { matchId: string; status: string }) => {
      return apiRequest('/api/v1/demands/matches', {
        method: 'PATCH',
        body: JSON.stringify({ matchId, status }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demandMatches'] });
    },
  });
}
