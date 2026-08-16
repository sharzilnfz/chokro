// Covers user engagement streaks, multiplier scaling, and deterministic milestone badge awards.
import { GET as getStreaks } from '../app/api/streaks/route';
import { POST as setOptOut } from '../app/api/streaks/opt-out/route';
import { GET as getBadges } from '../app/api/badges/route';
import { GET as getBadgeById } from '../app/api/badges/[awardId]/route';
import { StreakDomain } from '../lib/domain/StreakDomain';
import { BadgeDomain } from '../lib/domain/BadgeDomain';
import { WalletDomain } from '../lib/domain/WalletDomain';
import { authHeaders, createTestUser, resetTestStore, tokenFor } from './test-utils';

describe('streaks & badges API & domain', () => {
  beforeEach(async () => {
    await resetTestStore();
  });

  describe('StreakDomain', () => {
    it('calculates multipliers correctly', () => {
      expect(StreakDomain.calculateMultiplier(0)).toBe('1.00');
      expect(StreakDomain.calculateMultiplier(1)).toBe('1.00');
      expect(StreakDomain.calculateMultiplier(2)).toBe('1.10');
      expect(StreakDomain.calculateMultiplier(6)).toBe('1.50');
      expect(StreakDomain.calculateMultiplier(11)).toBe('2.00');
      expect(StreakDomain.calculateMultiplier(50)).toBe('2.00'); // Capped at 2.00
    });

    it('advances streak consecutively and remains idempotent on same-day activity', async () => {
      const user = await createTestUser('INDIVIDUAL');

      const day1 = new Date('2026-08-01T10:00:00Z');
      const streak1 = await StreakDomain.recordActivity(user.id, day1);
      expect(streak1.current_streak_days).toBe(1);
      expect(streak1.streak_multiplier).toBe('1.00');

      // Same day second action -> no change
      const day1Later = new Date('2026-08-01T15:00:00Z');
      const streak1Same = await StreakDomain.recordActivity(user.id, day1Later);
      expect(streak1Same.current_streak_days).toBe(1);

      // Next consecutive day -> increment
      const day2 = new Date('2026-08-02T09:00:00Z');
      const streak2 = await StreakDomain.recordActivity(user.id, day2);
      expect(streak2.current_streak_days).toBe(2);
      expect(streak2.streak_multiplier).toBe('1.10');
      expect(streak2.longest_streak_days).toBe(2);

      // 3-day gap -> reset to 1
      const day5 = new Date('2026-08-05T12:00:00Z');
      const streak3 = await StreakDomain.recordActivity(user.id, day5);
      expect(streak3.current_streak_days).toBe(1);
      expect(streak3.streak_multiplier).toBe('1.00');
      expect(streak3.longest_streak_days).toBe(2); // Longest preserved
    });
  });

  describe('BadgeDomain & Wallet Integration', () => {
    it('awards FIRST_VERIFIED_DEPOSIT and WASTE_10KG on verified credit adjustment', async () => {
      const user = await createTestUser('INDIVIDUAL');

      // Initial badges
      const initialBadges = await BadgeDomain.getUserBadges(user.id);
      expect(initialBadges).toHaveLength(0);

      // Create verified credit adjustment
      await WalletDomain.createAdjustment({
        userId: user.id,
        amount: 25.0,
        reason: 'Verified aluminum cans batch',
      });

      const userBadges = await BadgeDomain.getUserBadges(user.id);
      const types = userBadges.map((b) => b.badge_type);

      expect(types).toContain('FIRST_VERIFIED_DEPOSIT');
      expect(types).toContain('WASTE_10KG');
      expect(types).not.toContain('WASTE_100KG');

      // Verify metadata presence
      const firstDeposit = userBadges.find((b) => b.badge_type === 'FIRST_VERIFIED_DEPOSIT');
      expect(firstDeposit?.definition?.title).toBe('First Step');
      expect(firstDeposit?.award_points).toBe('50.00');

      // Verify public badge retrieval
      const publicRes = await getBadgeById(
        new Request(`http://localhost/api/badges/${firstDeposit!.id}`),
        { params: Promise.resolve({ awardId: firstDeposit!.id }) }
      );
      const publicData = await publicRes.json();
      expect(publicRes.status).toBe(200);
      expect(publicData.badge.badge_type).toBe('FIRST_VERIFIED_DEPOSIT');
    });

    it('awards STREAK_7 badge when streak reaches 7 days', async () => {
      const user = await createTestUser('INDIVIDUAL');

      // Fast forward 7 consecutive days
      for (let i = 1; i <= 7; i++) {
        const date = new Date(`2026-08-0${i}T10:00:00Z`);
        await StreakDomain.recordActivity(user.id, date);
      }

      await BadgeDomain.maybeAwardBadges(user.id);

      const userBadges = await BadgeDomain.getUserBadges(user.id);
      const types = userBadges.map((b) => b.badge_type);
      expect(types).toContain('STREAK_7');
      expect(types).not.toContain('STREAK_30');
    });
  });

  describe('Streaks & Badges API Endpoints', () => {
    it('returns user streak state and toggles opt-out', async () => {
      const user = await createTestUser('INDIVIDUAL');

      // Get initial streak
      const res1 = await getStreaks(
        new Request('http://localhost/api/streaks', {
          headers: authHeaders(tokenFor(user)),
        })
      );
      const data1 = await res1.json();
      expect(res1.status).toBe(200);
      expect(data1.streak.current_streak_days).toBe(0);
      expect(data1.streak.leaderboard_opt_out).toBe(false);

      // Toggle opt-out
      const res2 = await setOptOut(
        new Request('http://localhost/api/streaks/opt-out', {
          method: 'POST',
          headers: authHeaders(tokenFor(user)),
          body: JSON.stringify({ leaderboard_opt_out: true }),
        })
      );
      expect(res2.status).toBe(200);

      // Verify persistence
      const res3 = await getStreaks(
        new Request('http://localhost/api/streaks', {
          headers: authHeaders(tokenFor(user)),
        })
      );
      const data3 = await res3.json();
      expect(data3.streak.leaderboard_opt_out).toBe(true);
    });

    it('returns badges directory for authenticated user', async () => {
      const user = await createTestUser('INDIVIDUAL');

      const res = await getBadges(
        new Request('http://localhost/api/badges', {
          headers: authHeaders(tokenFor(user)),
        })
      );
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(data.badges)).toBe(true);
    });
  });
});
