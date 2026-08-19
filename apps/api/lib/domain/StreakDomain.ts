// StreakDomain: calculation rules and updates for user activity streaks and point multipliers.
import { userStreaksRepo } from '@/lib/repos/userStreaks';
import type { Streak } from '@chokro/shared';

export interface NextStreakResult {
  currentStreakDays: number;
  longestStreakDays: number;
  multiplier: string;
  isUpdated: boolean;
}

export const StreakDomain = {
  calculateMultiplier(streakDays: number): string {
    if (streakDays <= 0) return '1.00';
    const mult = Math.min(2.0, 1.0 + Math.max(0, streakDays - 1) * 0.1);
    return mult.toFixed(2);
  },

  calculateDayDiff(lastActiveDate: Date | string | null, currentDate: Date = new Date()): number {
    if (!lastActiveDate) return Infinity;
    const last = new Date(lastActiveDate);
    const curr = new Date(currentDate);
    const utcLast = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
    const utcCurr = Date.UTC(curr.getUTCFullYear(), curr.getUTCMonth(), curr.getUTCDate());
    const diffMs = utcCurr - utcLast;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  },

  calculateNextStreak(
    currentStreakDays: number,
    longestStreakDays: number,
    lastActiveAt: Date | string | null,
    currentDate: Date = new Date()
  ): NextStreakResult {
    if (!lastActiveAt || currentStreakDays === 0) {
      const current = 1;
      const longest = Math.max(longestStreakDays, 1);
      return {
        currentStreakDays: current,
        longestStreakDays: longest,
        multiplier: this.calculateMultiplier(current),
        isUpdated: true,
      };
    }

    const diff = this.calculateDayDiff(lastActiveAt, currentDate);

    if (diff <= 0) {
      return {
        currentStreakDays,
        longestStreakDays,
        multiplier: this.calculateMultiplier(currentStreakDays),
        isUpdated: false,
      };
    }

    if (diff === 1) {
      const current = currentStreakDays + 1;
      const longest = Math.max(longestStreakDays, current);
      return {
        currentStreakDays: current,
        longestStreakDays: longest,
        multiplier: this.calculateMultiplier(current),
        isUpdated: true,
      };
    }

    const current = 1;
    const longest = Math.max(longestStreakDays, 1);
    return {
      currentStreakDays: current,
      longestStreakDays: longest,
      multiplier: this.calculateMultiplier(current),
      isUpdated: true,
    };
  },

  async getStreak(userId: string): Promise<Streak> {
    const row = await userStreaksRepo.findByUserId(userId);
    if (!row) {
      return {
        current_streak_days: 0,
        longest_streak_days: 0,
        streak_multiplier: '1.00',
        last_active_at: null,
        leaderboard_opt_out: false,
      };
    }
    return {
      current_streak_days: row.current_streak_days,
      longest_streak_days: row.longest_streak_days,
      streak_multiplier: row.streak_multiplier,
      last_active_at: row.last_active_at ? row.last_active_at.toISOString() : null,
      leaderboard_opt_out: row.leaderboard_opt_out,
    };
  },

  async recordActivity(userId: string, activeAt: Date = new Date()): Promise<Streak> {
    const existing = await userStreaksRepo.findByUserId(userId);
    const currentStreakDays = existing?.current_streak_days ?? 0;
    const longestStreakDays = existing?.longest_streak_days ?? 0;
    const lastActiveAt = existing?.last_active_at ?? null;
    const optOut = existing?.leaderboard_opt_out ?? false;

    const next = this.calculateNextStreak(currentStreakDays, longestStreakDays, lastActiveAt, activeAt);

    if (!existing || next.isUpdated) {
      const saved = await userStreaksRepo.upsert({
        user_id: userId,
        current_streak_days: next.currentStreakDays,
        longest_streak_days: next.longestStreakDays,
        streak_multiplier: next.multiplier,
        last_active_at: activeAt,
        leaderboard_opt_out: optOut,
      });

      return {
        current_streak_days: saved.current_streak_days,
        longest_streak_days: saved.longest_streak_days,
        streak_multiplier: saved.streak_multiplier,
        last_active_at: saved.last_active_at ? saved.last_active_at.toISOString() : null,
        leaderboard_opt_out: saved.leaderboard_opt_out,
      };
    }

    return {
      current_streak_days: existing.current_streak_days,
      longest_streak_days: existing.longest_streak_days,
      streak_multiplier: existing.streak_multiplier,
      last_active_at: existing.last_active_at ? existing.last_active_at.toISOString() : null,
      leaderboard_opt_out: existing.leaderboard_opt_out,
    };
  },

  async setOptOut(userId: string, optOut: boolean): Promise<Streak> {
    const saved = await userStreaksRepo.updateOptOut(userId, optOut);
    return {
      current_streak_days: saved.current_streak_days,
      longest_streak_days: saved.longest_streak_days,
      streak_multiplier: saved.streak_multiplier,
      last_active_at: saved.last_active_at ? saved.last_active_at.toISOString() : null,
      leaderboard_opt_out: saved.leaderboard_opt_out,
    };
  },
};
