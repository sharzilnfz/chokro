// useStreaks hook: user activity streak, multipliers, and leaderboard opt-out preference.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Streak } from '@chokro/shared';

export const STREAKS_QUERY_KEY = ['streaks'] as const;

export function useStreaks() {
  return useQuery<{ streak: Streak }, Error>({
    queryKey: STREAKS_QUERY_KEY,
    queryFn: async () => {
      return apiRequest<{ streak: Streak }>('/api/streaks');
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useSetOptOut() {
  const queryClient = useQueryClient();

  return useMutation<{ streak: Streak }, Error, boolean>({
    mutationFn: async (leaderboard_opt_out: boolean) => {
      const response = await apiRequest<{ streak: Streak }>('/api/streaks/opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaderboard_opt_out }),
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STREAKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}
