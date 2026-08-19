// DTOs for streaks, campus leaderboards, milestone badges, and opt-out preferences.
import { z } from 'zod';
import { BadgeTypeEnum, LeaderboardPeriodEnum } from '../enums';

// Query parameters for fetching period-based campus leaderboards
export const LeaderboardQuerySchema = z.object({
  period: LeaderboardPeriodEnum.default('WEEKLY'),
});
export type LeaderboardQueryInput = z.infer<typeof LeaderboardQuerySchema>;

// Payload for updating user leaderboard privacy opt-out preferences
export const OptOutSchema = z.object({
  leaderboard_opt_out: z.boolean(),
});
export type OptOutInput = z.infer<typeof OptOutSchema>;

// Canonical user engagement streak shape
export const StreakSchema = z.object({
  current_streak_days: z.number(),
  longest_streak_days: z.number(),
  streak_multiplier: z.string(),
  last_active_at: z.string().nullable(),
  leaderboard_opt_out: z.boolean(),
});
export type Streak = z.infer<typeof StreakSchema>;

// Milestone badge award record representation
export const BadgeAwardSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  badge_type: BadgeTypeEnum,
  award_points: z.string(),
  meta: z.record(z.string(), z.unknown()).default({}),
  awarded_at: z.string(),
  created_at: z.string(),
});
export type BadgeAward = z.infer<typeof BadgeAwardSchema>;

// Materialized campus leaderboard entry
export const CampusLeaderboardEntrySchema = z.object({
  id: z.string().optional(),
  period: LeaderboardPeriodEnum,
  campus_id: z.string(),
  total_points: z.string(),
  member_count: z.number(),
  top_scorer_user_id: z.string().nullable().optional(),
  snapshot_date: z.string(),
  created_at: z.string().optional(),
});
export type CampusLeaderboardEntry = z.infer<typeof CampusLeaderboardEntrySchema>;

// Full response payload returned by GET /api/leaderboard
export const LeaderboardResponseSchema = z.object({
  period: LeaderboardPeriodEnum,
  campuses: z.array(CampusLeaderboardEntrySchema),
  my_row: CampusLeaderboardEntrySchema.nullable().optional(),
});
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
