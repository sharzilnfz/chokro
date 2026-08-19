// Data hooks for the admin campus leaderboard: fetch rankings and trigger snapshot materialization.
'use client';

import type { CampusLeaderboardEntry, LeaderboardPeriod, LeaderboardResponse } from '@chokro/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';

export const ADMIN_LEADERBOARD_QUERY_KEY = ['admin', 'leaderboard'] as const;

export function useAdminLeaderboard(period: LeaderboardPeriod = 'WEEKLY') {
  const { status } = useAdminAuth();

  return useQuery<CampusLeaderboardEntry[]>({
    queryKey: [...ADMIN_LEADERBOARD_QUERY_KEY, period],
    queryFn: async () => {
      const data = await adminApiRequest<LeaderboardResponse>(`/api/leaderboard?period=${period}`);
      return Array.isArray(data.campuses) ? data.campuses : [];
    },
    enabled: status === 'signed-in',
  });
}

export function useRefreshLeaderboard() {
  const queryClient = useQueryClient();

  return useMutation<{ result: Record<string, unknown> }, Error>({
    mutationFn: async () => {
      return adminApiRequest<{ result: Record<string, unknown> }>('/api/admin/leaderboard/refresh', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_LEADERBOARD_QUERY_KEY });
    },
  });
}
