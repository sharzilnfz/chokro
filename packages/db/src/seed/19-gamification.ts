import { db, users, userStreaks, badgeAwards, campusLeaderboards } from '../index';
import { and, eq } from 'drizzle-orm';
// Seed scenario section 19 — moved verbatim from the original seed().
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { student1User, student2User, recyclerRahimUser, adminOrgUser } = ctx.users;

  // =========================================================================
  // 19. GAMIFICATION, STREAKS, BADGES & CAMPUS LEADERBOARDS
  // =========================================================================
  // Streaks
  const [existingStreak1] = await db.select().from(userStreaks).where(eq(userStreaks.user_id, student1User.id)).limit(1);
  if (existingStreak1) {
    await db.update(userStreaks).set({ current_streak_days: 6, longest_streak_days: 6, last_active_at: new Date() }).where(eq(userStreaks.id, existingStreak1.id));
  } else {
    await db.insert(userStreaks).values({
      user_id: student1User.id,
      current_streak_days: 6,
      longest_streak_days: 6,
      streak_multiplier: '1.50',
      last_active_at: new Date(),
      leaderboard_opt_out: false,
    });
  }

  const [existingStreak2] = await db.select().from(userStreaks).where(eq(userStreaks.user_id, student2User.id)).limit(1);
  if (existingStreak2) {
    await db.update(userStreaks).set({ current_streak_days: 14, longest_streak_days: 14, last_active_at: new Date() }).where(eq(userStreaks.id, existingStreak2.id));
  } else {
    await db.insert(userStreaks).values({
      user_id: student2User.id,
      current_streak_days: 14,
      longest_streak_days: 14,
      streak_multiplier: '2.00',
      last_active_at: new Date(),
      leaderboard_opt_out: false,
    });
  }

  // Badges
  const badgesToSeed = [
    { userId: student1User.id, badgeType: 'FIRST_VERIFIED_DEPOSIT', awardPoints: '50.00', meta: { campus: 'BRACU', note: 'First verified drop zone deposit' } },
    { userId: student1User.id, badgeType: 'WASTE_10KG', awardPoints: '100.00', meta: { campus: 'BRACU', note: 'Diverted 10kg from landfills' } },
    { userId: student2User.id, badgeType: 'FIRST_VERIFIED_DEPOSIT', awardPoints: '50.00', meta: { campus: 'DU', note: 'First verified recycling deposit' } },
    { userId: student2User.id, badgeType: 'STREAK_7', awardPoints: '150.00', meta: { campus: 'DU', note: '7-day active recycling streak' } },
    { userId: recyclerRahimUser.id, badgeType: 'E_WASTE_STEWARD', awardPoints: '500.00', meta: { note: 'DoE Licensed E-Waste Recycler Champion' } },
  ];

  for (const b of badgesToSeed) {
    const [existingBadge] = await db
      .select()
      .from(badgeAwards)
      .where(and(eq(badgeAwards.user_id, b.userId), eq(badgeAwards.badge_type, b.badgeType)))
      .limit(1);
    if (!existingBadge) {
      await db.insert(badgeAwards).values({
        user_id: b.userId,
        badge_type: b.badgeType,
        award_points: b.awardPoints,
        meta: b.meta,
      });
    }
  }

  // Campus Leaderboards
  const today = new Date().toISOString().slice(0, 10);
  const seedLeaderboards = [
    { period: 'WEEKLY', campus_id: 'BRACU', total_points: '1420.00', member_count: 32, top_scorer_user_id: student1User.id, snapshot_date: today },
    { period: 'WEEKLY', campus_id: 'DU', total_points: '980.00', member_count: 24, top_scorer_user_id: student2User.id, snapshot_date: today },
    { period: 'WEEKLY', campus_id: 'BUET', total_points: '750.00', member_count: 18, top_scorer_user_id: null, snapshot_date: today },
    { period: 'WEEKLY', campus_id: 'NSU', total_points: '620.00', member_count: 15, top_scorer_user_id: adminOrgUser.id, snapshot_date: today },
    { period: 'MONTHLY', campus_id: 'BRACU', total_points: '5680.00', member_count: 85, top_scorer_user_id: student1User.id, snapshot_date: today },
    { period: 'MONTHLY', campus_id: 'DU', total_points: '4120.00', member_count: 62, top_scorer_user_id: student2User.id, snapshot_date: today },
    { period: 'MONTHLY', campus_id: 'BUET', total_points: '3200.00', member_count: 45, top_scorer_user_id: null, snapshot_date: today },
    { period: 'MONTHLY', campus_id: 'NSU', total_points: '2800.00', member_count: 38, top_scorer_user_id: adminOrgUser.id, snapshot_date: today },
    { period: 'ALL_TIME', campus_id: 'BRACU', total_points: '18400.00', member_count: 140, top_scorer_user_id: student1User.id, snapshot_date: today },
    { period: 'ALL_TIME', campus_id: 'DU', total_points: '12900.00', member_count: 110, top_scorer_user_id: student2User.id, snapshot_date: today },
    { period: 'ALL_TIME', campus_id: 'BUET', total_points: '9500.00', member_count: 80, top_scorer_user_id: null, snapshot_date: today },
    { period: 'ALL_TIME', campus_id: 'NSU', total_points: '8100.00', member_count: 75, top_scorer_user_id: adminOrgUser.id, snapshot_date: today },
  ] as const;

  for (const entry of seedLeaderboards) {
    const [existingEntry] = await db
      .select()
      .from(campusLeaderboards)
      .where(and(eq(campusLeaderboards.period, entry.period), eq(campusLeaderboards.campus_id, entry.campus_id)))
      .limit(1);
    if (existingEntry) {
      await db.update(campusLeaderboards).set(entry).where(eq(campusLeaderboards.id, existingEntry.id));
    } else {
      await db.insert(campusLeaderboards).values(entry);
    }
  }

}
