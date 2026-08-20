// userStreaks repo: persistence for user engagement streak records and opt-out preferences.
import { db, userStreaks, eq } from '@chokro/db';
import { withDb } from './seam';

export type UserStreak = typeof userStreaks.$inferSelect;

export interface UpsertUserStreakInput {
  user_id: string;
  current_streak_days: number;
  longest_streak_days: number;
  streak_multiplier?: string;
  last_active_at?: Date | null;
  leaderboard_opt_out?: boolean;
}

export const userStreaksRepo = {
  async findByUserId(userId: string): Promise<UserStreak | null> {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(userStreaks)
        .where(eq(userStreaks.user_id, userId))
        .limit(1);
      return rows[0] || null;
    });
  },

  async upsert(input: UpsertUserStreakInput): Promise<UserStreak> {
    return withDb(async () => {
      const multiplier = input.streak_multiplier ?? '1.00';
      const lastActiveAt = input.last_active_at ?? new Date();

      const [streak] = await db
        .insert(userStreaks)
        .values({
          user_id: input.user_id,
          current_streak_days: input.current_streak_days,
          longest_streak_days: input.longest_streak_days,
          streak_multiplier: multiplier,
          last_active_at: lastActiveAt,
          leaderboard_opt_out: input.leaderboard_opt_out ?? false,
        })
        .onConflictDoUpdate({
          target: userStreaks.user_id,
          set: {
            current_streak_days: input.current_streak_days,
            longest_streak_days: input.longest_streak_days,
            streak_multiplier: multiplier,
            last_active_at: lastActiveAt,
            ...(input.leaderboard_opt_out !== undefined
              ? { leaderboard_opt_out: input.leaderboard_opt_out }
              : {}),
          },
        })
        .returning();

      return streak;
    });
  },

  async updateOptOut(userId: string, optOut: boolean): Promise<UserStreak> {
    return withDb(async () => {
      const existing = await db
        .select()
        .from(userStreaks)
        .where(eq(userStreaks.user_id, userId))
        .limit(1);

      if (existing[0]) {
        const [updated] = await db
          .update(userStreaks)
          .set({ leaderboard_opt_out: optOut })
          .where(eq(userStreaks.user_id, userId))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(userStreaks)
        .values({
          user_id: userId,
          current_streak_days: 0,
          longest_streak_days: 0,
          streak_multiplier: '1.00',
          leaderboard_opt_out: optOut,
        })
        .returning();

      return created;
    });
  },
};
