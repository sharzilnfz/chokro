import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Category, Condition } from '@/types';

export type PickupStatus = 'REQUESTED' | 'ASSIGNED' | 'EN_ROUTE' | 'COLLECTED' | 'CANCELLED';

export type PickupListing = {
  id: string;
  category: Category;
  unit: 'kg' | 'piece';
  declared_weight?: string | number | null;
  piece_count?: number | null;
  declared_condition: Condition;
};

export type PickupCollector = {
  id: string;
  org_name: string;
  vehicle_label?: string | null;
  vehicle_capacity_kg?: string | number | null;
};

export type PickupOrder = {
  id: string;
  listing_id: string;
  customer_id: string;
  collector_partner_id?: string | null;
  status: PickupStatus;
  address: string;
  lat: number;
  lng: number;
  scheduled_for: string;
  notes?: string | null;
  listing: PickupListing;
  collector?: PickupCollector | null;
};

export type AssignedCollector = {
  partner: PickupCollector & {
    base_lat?: number | null;
    base_lng?: number | null;
    service_radius_km?: number | null;
  };
  distance_km: number;
  remaining_capacity_kg: number | null;
};

export type CollectorEvaluation = {
  partner_id: string;
  org_name: string;
  distance_km: number;
  remaining_capacity_kg: number | null;
  eligible: boolean;
  skip_reason: 'OUT_OF_RADIUS' | 'INSUFFICIENT_CAPACITY' | 'E_WASTE_LICENSE_REQUIRED' | null;
};

export type PickupListResponse = {
  pickups: PickupOrder[];
  collectorPickups: PickupOrder[];
};

export type BookPickupInput = {
  listingId: string;
  address: string;
  lat: number;
  lng: number;
  scheduledFor: string;
  notes?: string;
};

export type BookPickupResult = {
  message: string;
  pickup: PickupOrder;
  collector: AssignedCollector | null;
  assignment_status: 'ASSIGNED' | 'PENDING_COLLECTOR';
  eligibility: CollectorEvaluation[];
};

export function usePickups() {
  return useQuery<PickupListResponse>({
    queryKey: ['pickups'],
    queryFn: () => apiRequest<PickupListResponse>('/api/v1/pickups'),
  });
}

export function useBookPickup() {
  const queryClient = useQueryClient();

  return useMutation<BookPickupResult, Error, BookPickupInput>({
    mutationFn: (input) =>
      apiRequest<BookPickupResult>('/api/v1/pickups', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pickups'] });
    },
  });
}

export function useUpdatePickupStatus() {
  const queryClient = useQueryClient();

  return useMutation<PickupOrder, Error, { id: string; status: PickupStatus }>({
    mutationFn: ({ id, status }) =>
      apiRequest<{ message: string; pickup: PickupOrder }>(`/api/v1/pickups/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }).then((data) => data.pickup),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pickups'] });
      void queryClient.invalidateQueries({ queryKey: ['collector-route'] });
    },
  });
}
