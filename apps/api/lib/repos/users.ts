// users repo: persistence for registered user accounts, with result rows narrowed
// to the shared Role type.
//
// Drizzle user table + equality comparator, shared role type, and the DB seam.
import { db, users, eq, sql } from '@chokro/db';
import type { Role } from '@chokro/shared';
import { withDb } from './seam';

// Row type with the role column pinned to the shared Role union.
export type User = typeof users.$inferSelect & {
  role: Role;
};

// Persistence payload; optional fields fall back to safe defaults on insert.
export interface CreateUserInput {
  email: string;
  password_hash?: string;
  role?: Role;
  institution_id?: string | null;
}

export const userRepo = {
  // Lookup by normalized email, e.g. for login and duplicate detection.
  async findByEmail(email: string): Promise<User | null> {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      return (rows[0] as User) || null;
    });
  },

  // Lookup by primary key.
  async findById(id: string): Promise<User | null> {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return (rows[0] as User) || null;
    });
  },

  // Insert a new account: emails are stored lowercase, the hash defaults to empty,
  // and without a role the user lands as INDIVIDUAL.
  async create(input: CreateUserInput): Promise<User> {
    return withDb(async () => {
      const [user] = await db
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          password_hash: input.password_hash || '',
          role: input.role || 'INDIVIDUAL',
          institution_id: input.institution_id || null,
        })
        .returning();
      return user as User;
    });
  },

  // Update a user's role (e.g. promoting to PARTNER upon verification or resetting to INDIVIDUAL on rejection).
  async updateRole(id: string, role: Role): Promise<User | null> {
    return withDb(async () => {
      const [updated] = await db
        .update(users)
        .set({ role })
        .where(eq(users.id, id))
        .returning();
      return (updated as User) || null;
    });
  },

  // Partial profile update: undefined fields are left untouched by Drizzle's .set().
  async updateProfile(id: string, input: {
    fullName?: string | null;
    phone?: string | null;
    institutionId?: string | null;
    studentIdDoc?: string | null;
  }): Promise<User | null> {
    return withDb(async () => {
      const [updated] = await db
        .update(users)
        .set({
          ...(input.fullName !== undefined ? { full_name: input.fullName } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.institutionId !== undefined ? { institution_id: input.institutionId } : {}),
          ...(input.studentIdDoc !== undefined ? { student_id_doc: input.studentIdDoc } : {}),
        })
        .where(eq(users.id, id))
        .returning();
      return (updated as User) || null;
    });
  },

  // Number of users linked to a campus slug — used to guard campus deletion.
  async countByInstitution(institutionId: string): Promise<number> {
    return withDb(async () => {
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.institution_id, institutionId));
      return Number(rows[0]?.count ?? 0);
    });
  },
};