import { useQuery } from '@tanstack/react-query';
import { apiRequest, ApiError } from '@/services/api';

export type PartnerProfile = {
  id: string;
  user_id: string;
  org_name: string;
  types: string[];
  e_waste_licensed: boolean;
  status: string;
  vehicle_label?: string | null;
  vehicle_capacity_kg?: string | number | null;
  base_lat?: number | null;
  base_lng?: number | null;
  service_radius_km?: number | null;
};

export function isCollectorPartner(partner: PartnerProfile | null | undefined): boolean {
  return Array.isArray(partner?.types) && partner.types.includes('COLLECTOR');
}

export function usePartnerMe() {
  return useQuery<PartnerProfile | null>({
    queryKey: ['partner-me'],
    queryFn: async () => {
      const data = await apiRequest<{ partner: PartnerProfile | null }>('/api/v1/partners/me');
      return data.partner ?? null;
    },
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}
