import { db, campuses, eq, desc, inArray } from '@chokro/db';
import { withDb } from './seam';

export const campusRepo = {
  async findAll(options?: { status?: string }) {
    return withDb(async () => {
      if (options?.status) {
        return db
          .select()
          .from(campuses)
          .where(eq(campuses.status, options.status))
          .orderBy(desc(campuses.created_at));
      }
      return db.select().from(campuses).orderBy(desc(campuses.created_at));
    });
  },
  async findById(id: string) {
    return withDb(async () => {
      const rows = await db.select().from(campuses).where(eq(campuses.id, id)).limit(1);
      return rows[0] || null;
    });
  },
  async findBySlug(slug: string) {
    return withDb(async () => {
      const rows = await db.select().from(campuses).where(eq(campuses.slug, slug)).limit(1);
      return rows[0] || null;
    });
  },
  async findAllBySlugs(slugs: string[]) {
    return withDb(async () => {
      if (slugs.length === 0) return [];
      return db.select().from(campuses).where(inArray(campuses.slug, slugs));
    });
  },
  async create(input: {
    slug: string;
    name: string;
    division: string;
    zilla: string;
    upazilla?: string | null;
    status?: string;
    reason?: string | null;
    createdBy?: string | null;
  }) {
    return withDb(async () => {
      const [row] = await db.insert(campuses).values({
        slug: input.slug,
        name: input.name,
        division: input.division,
        zilla: input.zilla,
        upazilla: input.upazilla || null,
        status: input.status || 'VERIFIED',
        reason: input.reason || null,
        created_by: input.createdBy || null,
      }).returning();
      return row;
    });
  },
  async updateStatus(id: string, status: string, reason?: string | null) {
    return withDb(async () => {
      const [row] = await db
        .update(campuses)
        .set({
          status,
          ...(reason !== undefined ? { reason } : {}),
        })
        .where(eq(campuses.id, id))
        .returning();
      return row || null;
    });
  },
  async remove(id: string) {
    return withDb(async () => {
      await db.delete(campuses).where(eq(campuses.id, id));
    });
  },
};
