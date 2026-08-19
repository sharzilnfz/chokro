// LeaderboardDomain: campus ranking retrieval and periodic snapshot materialization.
import { campusLeaderboardsRepo } from '@/lib/repos/campusLeaderboards';
import { userRepo } from '@/lib/repos/users';
import { userStreaksRepo } from '@/lib/repos/userStreaks';
import { BadgeDomain } from '@/lib/domain/BadgeDomain';
import {
  LEADERBOARD_PERIODS,
  type LeaderboardPeriod,
  type CampusLeaderboardEntry,
  type LeaderboardResponse,
} from '@chokro/shared';

export const LeaderboardDomain = {
  async getRankings(period: LeaderboardPeriod, currentUserId?: string): Promise<LeaderboardResponse> {
    const published = await campusLeaderboardsRepo.findPublished(period);

    const campuses: CampusLeaderboardEntry[] = published.map((p) => ({
      id: p.id,
      period: p.period as LeaderboardPeriod,
      campus_id: p.campus_id,
      total_points: p.total_points,
      member_count: p.member_count,
      top_scorer_user_id: p.top_scorer_user_id || null,
      snapshot_date:
        typeof p.snapshot_date === 'string'
          ? p.snapshot_date
          : new Date(p.snapshot_date).toISOString().slice(0, 10),
      created_at: p.created_at ? p.created_at.toISOString() : undefined,
    }));

    let myRow: CampusLeaderboardEntry | null = null;

    if (currentUserId) {
      const user = await userRepo.findById(currentUserId);
      if (user?.institution_id) {
        const streak = await userStreaksRepo.findByUserId(currentUserId);
        if (!streak?.leaderboard_opt_out) {
          const match = campuses.find((c) => c.campus_id === user.institution_id);
          if (match) {
            myRow = match;
          }
        }
      }
    }

    return {
      period,
      campuses,
      my_row: myRow,
    };
  },

  async materializeAll() {
    const snapshotDate = new Date().toISOString().slice(0, 10);
    const results: Record<string, number> = {};

    for (const period of LEADERBOARD_PERIODS) {
      const aggregates = await campusLeaderboardsRepo.computeCampusAggregates(period);

      const entries = aggregates.map((agg) => ({
        period,
        campus_id: agg.campus_id,
        total_points: agg.total_points,
        member_count: agg.member_count,
        top_scorer_user_id: agg.top_scorer_user_id,
        snapshot_date: snapshotDate,
      }));

      if (entries.length > 0) {
        await campusLeaderboardsRepo.saveSnapshot(entries);

        for (const entry of entries) {
          if (entry.top_scorer_user_id) {
            await BadgeDomain.maybeAwardBadges(entry.top_scorer_user_id, {
              campusTop3: true,
            });
          }
        }
      }

      results[period] = entries.length;
    }

    return {
      snapshot_date: snapshotDate,
      materialized_counts: results,
    };
  },
};
