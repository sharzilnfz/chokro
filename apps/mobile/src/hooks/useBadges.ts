// useBadges hook: loads user's earned badges and milestone definitions.
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { BadgeDefinition, BadgeType } from '@chokro/shared';

export interface MobileBadgeAward {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  award_points: string;
  meta: Record<string, unknown>;
  awarded_at: string;
  created_at: string;
  definition: BadgeDefinition | null;
}

export const BADGES_QUERY_KEY = ['badges'] as const;

export function useBadges() {
  return useQuery<{ badges: MobileBadgeAward[] }, Error>({
    queryKey: BADGES_QUERY_KEY,
    queryFn: async () => {
      return apiRequest<{ badges: MobileBadgeAward[] }>('/api/badges');
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
