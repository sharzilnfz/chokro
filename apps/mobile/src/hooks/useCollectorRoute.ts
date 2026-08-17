import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { PartnerProfile } from './usePartnerMe';
import type { PickupStatus } from './usePickups';
import type { Category, Condition } from '@/types';

export type RouteStop = {
  stop_sequence: number;
  order_id: string;
  status: PickupStatus;
  address: string;
  scheduled_for: string;
  notes?: string | null;
  lat: number;
  lng: number;
  listing: {
    id: string;
    category: Category;
    unit: 'kg' | 'piece';
    declared_weight?: string | number | null;
    piece_count?: number | null;
    condition: Condition;
  };
  customer_id: string;
  distance_from_previous_km: number;
  cumulative_eta_minutes: number;
};

export type CollectorRoute = {
  partner: PartnerProfile;
  routing_source: 'mapbox' | 'osrm' | 'haversine_fallback';
  base: { lat: number; lng: number };
  stops: RouteStop[];
};

export function useCollectorRoute(enabled: boolean) {
  return useQuery<CollectorRoute>({
    queryKey: ['collector-route'],
    enabled,
    refetchInterval: 30_000,
    queryFn: () => apiRequest<CollectorRoute>('/api/v1/pickups/collector-route'),
  });
}
