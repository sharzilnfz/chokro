// badgeAwards repo: persistence for earned user badges and milestones.
import { db, badgeAwards, eq, and, desc } from '@chokro/db';
import { withDb } from './seam';

export type BadgeAwardRow = typeof badgeAwards.$inferSelect;

export interface AwardBadgeInput {
  userId: string;
  badgeType: string;
  awardPoints: string | number;
  meta?: Record<string, unknown>;
}

export const badgeAwardsRepo = {
  async findByUserId(userId: string): Promise<BadgeAwardRow[]> {
    return withDb(async () => {
      return db
        .select()
        .from(badgeAwards)
        .where(eq(badgeAwards.user_id, userId))
        .orderBy(desc(badgeAwards.awarded_at));
    });
  },

  async findByUserIdAndType(userId: string, badgeType: string): Promise<BadgeAwardRow | null> {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(badgeAwards)
        .where(and(eq(badgeAwards.user_id, userId), eq(badgeAwards.badge_type, badgeType)))
        .limit(1);
      return rows[0] || null;
    });
  },

  async award(input: AwardBadgeInput): Promise<BadgeAwardRow> {
    return withDb(async () => {
      const [row] = await db
        .insert(badgeAwards)
        .values({
          user_id: input.userId,
          badge_type: input.badgeType,
          award_points: String(Number(input.awardPoints).toFixed(2)),
          meta: input.meta || {},
          awarded_at: new Date(),
        })
        .returning();
      return row;
    });
  },

  async findById(id: string): Promise<BadgeAwardRow | null> {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(badgeAwards)
        .where(eq(badgeAwards.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },
};
