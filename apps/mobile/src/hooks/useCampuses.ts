import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Campus } from '@chokro/shared';

export const CAMPUSES_QUERY_KEY = ['campuses'] as const;

export function useCampuses() {
  return useQuery<Campus[]>({
    queryKey: CAMPUSES_QUERY_KEY,
    queryFn: async () => {
      const data = await apiRequest<{ campuses: Campus[] }>('/api/campuses');
      return data.campuses ?? [];
    },
  });
}
