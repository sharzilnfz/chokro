// BadgeDomain: evaluation and issuance of milestone and achievement badges.
import { badgeAwardsRepo } from '@/lib/repos/badgeAwards';
import { walletRepo } from '@/lib/repos/wallet';
import { partnerRepo } from '@/lib/repos/partners';
import { StreakDomain } from '@/lib/domain/StreakDomain';
import { BADGE_DEFINITIONS, type BadgeType, type BadgeDefinition } from '@chokro/shared';

export interface UserBadgeAwardWithMeta {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  award_points: string;
  meta: Record<string, unknown>;
  awarded_at: string;
  created_at: string;
  definition: BadgeDefinition | null;
}

export interface BadgeEvaluationContext {
  campusTop3?: boolean;
  eWasteLicensed?: boolean;
}

export const BadgeDomain = {
  async getUserBadges(userId: string): Promise<UserBadgeAwardWithMeta[]> {
    const awards = await badgeAwardsRepo.findByUserId(userId);
    return awards.map((a) => ({
      id: a.id,
      user_id: a.user_id,
      badge_type: a.badge_type as BadgeType,
      award_points: a.award_points,
      meta: (a.meta || {}) as Record<string, unknown>,
      awarded_at: a.awarded_at.toISOString(),
      created_at: a.created_at.toISOString(),
      definition: BADGE_DEFINITIONS[a.badge_type as BadgeType] || null,
    }));
  },

  async getBadgeById(awardId: string): Promise<UserBadgeAwardWithMeta | null> {
    const award = await badgeAwardsRepo.findById(awardId);
    if (!award) return null;
    return {
      id: award.id,
      user_id: award.user_id,
      badge_type: award.badge_type as BadgeType,
      award_points: award.award_points,
      meta: (award.meta || {}) as Record<string, unknown>,
      awarded_at: award.awarded_at.toISOString(),
      created_at: award.created_at.toISOString(),
      definition: BADGE_DEFINITIONS[award.badge_type as BadgeType] || null,
    };
  },

  async maybeAwardBadges(
    userId: string,
    context?: BadgeEvaluationContext
  ): Promise<UserBadgeAwardWithMeta[]> {
    const existingAwards = await badgeAwardsRepo.findByUserId(userId);
    const awardedSet = new Set(existingAwards.map((a) => a.badge_type));
    const newAwards: UserBadgeAwardWithMeta[] = [];

    const txns = await walletRepo.findTransactionsByOwner(userId);
    const verifiedTxns = txns.filter((t) => t.status === 'VERIFIED');
    const verifiedCount = verifiedTxns.length;
    const totalVerifiedAmount = verifiedTxns.reduce(
      (sum, t) => sum + (Number(t.amount) || 0),
      0
    );

    const streak = await StreakDomain.getStreak(userId);
    const partner = await partnerRepo.findByUserId(userId);

    const grant = async (badgeType: BadgeType, points: string, meta: Record<string, unknown>) => {
      if (awardedSet.has(badgeType)) return;
      const row = await badgeAwardsRepo.award({
        userId,
        badgeType,
        awardPoints: points,
        meta,
      });
      awardedSet.add(badgeType);
      newAwards.push({
        id: row.id,
        user_id: row.user_id,
        badge_type: row.badge_type as BadgeType,
        award_points: row.award_points,
        meta: (row.meta || {}) as Record<string, unknown>,
        awarded_at: row.awarded_at.toISOString(),
        created_at: row.created_at.toISOString(),
        definition: BADGE_DEFINITIONS[badgeType] || null,
      });
    };

    if (verifiedCount >= 1) {
      await grant('FIRST_VERIFIED_DEPOSIT', '50.00', { count: verifiedCount });
    }

    if (totalVerifiedAmount >= 10) {
      await grant('WASTE_10KG', '20.00', { totalAmount: totalVerifiedAmount });
    }

    if (totalVerifiedAmount >= 100) {
      await grant('WASTE_100KG', '100.00', { totalAmount: totalVerifiedAmount });
    }

    const isEWasteLicensed =
      context?.eWasteLicensed ||
      (partner && partner.status === 'VERIFIED' && partner.e_waste_licensed);
    if (isEWasteLicensed) {
      await grant('E_WASTE_STEWARD', '50.00', { licensed: true });
    }

    if (streak.current_streak_days >= 7 || streak.longest_streak_days >= 7) {
      await grant('STREAK_7', '30.00', {
        streakDays: Math.max(streak.current_streak_days, streak.longest_streak_days),
      });
    }

    if (streak.current_streak_days >= 30 || streak.longest_streak_days >= 30) {
      await grant('STREAK_30', '100.00', {
        streakDays: Math.max(streak.current_streak_days, streak.longest_streak_days),
      });
    }

    if (context?.campusTop3) {
      await grant('CAMPUS_TOP_3', '150.00', { rank: 1 });
    }

    return newAwards;
  },
};
