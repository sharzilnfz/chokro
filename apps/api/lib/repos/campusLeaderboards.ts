// campusLeaderboards repo: materialized snapshots and aggregate calculations.
import { db, campusLeaderboards, eq, and, desc, sql } from '@chokro/db';
import { withDb } from './seam';

export type CampusLeaderboardRow = typeof campusLeaderboards.$inferSelect;

export interface SaveCampusSnapshotInput {
  period: string;
  campus_id: string;
  total_points: string;
  member_count: number;
  top_scorer_user_id?: string | null;
  snapshot_date: string;
}

export interface CampusAggregateResult {
  campus_id: string;
  total_points: string;
  member_count: number;
  top_scorer_user_id: string | null;
}

export const campusLeaderboardsRepo = {
  async findPublished(period: string): Promise<CampusLeaderboardRow[]> {
    return withDb(async () => {
      return db
        .select()
        .from(campusLeaderboards)
        .where(eq(campusLeaderboards.period, period))
        .orderBy(sql`CAST(${campusLeaderboards.total_points} AS NUMERIC) DESC`);
    });
  },

  async findUserCampusRank(period: string, campusId: string): Promise<CampusLeaderboardRow | null> {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(campusLeaderboards)
        .where(
          and(
            eq(campusLeaderboards.period, period),
            eq(campusLeaderboards.campus_id, campusId)
          )
        )
        .orderBy(desc(campusLeaderboards.snapshot_date), desc(campusLeaderboards.created_at))
        .limit(1);
      return rows[0] || null;
    });
  },

  async saveSnapshot(entries: SaveCampusSnapshotInput[]): Promise<CampusLeaderboardRow[]> {
    return withDb(async () => {
      if (entries.length === 0) return [];
      return db
        .insert(campusLeaderboards)
        .values(
          entries.map((e) => ({
            period: e.period,
            campus_id: e.campus_id,
            total_points: e.total_points,
            member_count: e.member_count,
            top_scorer_user_id: e.top_scorer_user_id || null,
            snapshot_date: e.snapshot_date,
          }))
        )
        .returning();
    });
  },

  async computeCampusAggregates(period: string): Promise<CampusAggregateResult[]> {
    return withDb(async () => {
      let periodCondition = sql`1=1`;
      if (period === 'WEEKLY') {
        periodCondition = sql`ct.created_at >= NOW() - INTERVAL '7 days'`;
      } else if (period === 'MONTHLY') {
        periodCondition = sql`ct.created_at >= NOW() - INTERVAL '30 days'`;
      }

      const query = sql`
        WITH user_period_scores AS (
          SELECT 
            u.institution_id AS campus_id,
            u.id AS user_id,
            SUM(CAST(ct.amount AS NUMERIC) * CAST(COALESCE(us.streak_multiplier, '1.00') AS NUMERIC)) AS user_points
          FROM users u
          JOIN credit_txns ct ON ct.user_id = u.id
          LEFT JOIN user_streaks us ON us.user_id = u.id
          WHERE u.institution_id IS NOT NULL
            AND u.institution_id <> ''
            AND ct.status = 'VERIFIED'
            AND COALESCE(us.leaderboard_opt_out, false) = false
            AND ${periodCondition}
          GROUP BY u.institution_id, u.id
        ),
        ranked_users AS (
          SELECT
            campus_id,
            user_id,
            user_points,
            ROW_NUMBER() OVER (PARTITION BY campus_id ORDER BY user_points DESC, user_id ASC) as rn
          FROM user_period_scores
        ),
        campus_totals AS (
          SELECT
            campus_id,
            SUM(user_points) as total_points,
            COUNT(DISTINCT user_id) as member_count
          FROM user_period_scores
          GROUP BY campus_id
        )
        SELECT
          ct.campus_id,
          ROUND(ct.total_points, 2)::text AS total_points,
          ct.member_count::int AS member_count,
          ru.user_id AS top_scorer_user_id
        FROM campus_totals ct
        LEFT JOIN ranked_users ru ON ru.campus_id = ct.campus_id AND ru.rn = 1
        ORDER BY ct.total_points DESC;
      `;

      const result = await db.execute(query);
      const rows: any[] = Array.isArray(result)
        ? result
        : (result && 'rows' in (result as any) ? (result as any).rows : []);

      return rows.map((r) => ({
        campus_id: String(r.campus_id),
        total_points: String(r.total_points || '0.00'),
        member_count: Number(r.member_count || 0),
        top_scorer_user_id: r.top_scorer_user_id ? String(r.top_scorer_user_id) : null,
      }));
    });
  },
};
