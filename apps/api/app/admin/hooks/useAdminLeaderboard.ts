// Data hooks for the admin campus leaderboard: fetch rankings and trigger snapshot materialization.
'use client';

import type { CampusLeaderboardEntry, LeaderboardPeriod, LeaderboardResponse } from '@chokro/shared';
import { useAdminList, useAdminAction } from './useAdminResource';

export const ADMIN_LEADERBOARD_QUERY_KEY = ['admin', 'leaderboard'] as const;

export function useAdminLeaderboard(period: LeaderboardPeriod = 'WEEKLY') {
  return useAdminList<LeaderboardResponse, CampusLeaderboardEntry>(
    [...ADMIN_LEADERBOARD_QUERY_KEY, period],
    `/api/leaderboard?period=${period}`,
    (data) => data.campuses,
  );
}

export function useRefreshLeaderboard() {
  return useAdminAction<{ result: Record<string, unknown> }>({
    path: '/api/admin/leaderboard/refresh',
    invalidate: [ADMIN_LEADERBOARD_QUERY_KEY],
  });
}
