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
      try {
        const data = await apiRequest<{ partner: PartnerProfile | null }>('/api/v1/partners/me');
        return data.partner ?? null;
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 401 || err.status === 403)) {
          return null;
        }
        throw err;
      }
    },
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 404 || error.status === 401 || error.status === 403)) return false;
      return failureCount < 2;
    },
  });
}
