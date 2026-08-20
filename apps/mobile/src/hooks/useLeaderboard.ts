// useLeaderboard hook: fetches inter-campus rankings per time window.
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { CampusLeaderboardEntry, LeaderboardPeriod, LeaderboardResponse } from '@chokro/shared';

export const LEADERBOARD_QUERY_KEY = ['leaderboard'] as const;

export function useLeaderboard(period: LeaderboardPeriod = 'WEEKLY') {
  return useQuery<LeaderboardResponse, Error>({
    queryKey: [...LEADERBOARD_QUERY_KEY, period],
    queryFn: async () => {
      const data = await apiRequest<LeaderboardResponse>(`/api/leaderboard?period=${period}`);
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
