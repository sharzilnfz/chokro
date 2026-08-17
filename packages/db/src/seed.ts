// Seeds local development data: demo accounts per role, a partner org, and baseline rates.
// ORM helpers and password hashing
import { db, users, partners, rateCardEntries, userStreaks, badgeAwards, campusLeaderboards, campuses } from './index';
import { and, eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';

// Local demo accounts only. Never reuse this password outside local development.
const DEMO_PASSWORD = 'password123';

// Idempotent user insert-or-update keyed by email so re-running the seed never duplicates
async function upsertUser(
  email: string,
  role: 'INDIVIDUAL' | 'PARTNER' | 'ADMIN',
  passwordHash: string,
  institutionId?: string,
  profile?: { fullName?: string; phone?: string; studentIdDoc?: string }
) {
  const [user] = await db
    .insert(users)
    .values({
      email,
      password_hash: passwordHash,
      role,
      institution_id: institutionId,
      full_name: profile?.fullName,
      phone: profile?.phone,
      student_id_doc: profile?.studentIdDoc,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        password_hash: passwordHash,
        role,
        ...(institutionId ? { institution_id: institutionId } : {}),
        ...(profile?.fullName ? { full_name: profile.fullName } : {}),
        ...(profile?.phone ? { phone: profile.phone } : {}),
        ...(profile?.studentIdDoc ? { student_id_doc: profile.studentIdDoc } : {}),
      },
    })
    .returning();
  return user;
}

// Idempotent campus insert keyed on slug
async function upsertCampus(input: {
  slug: string;
  name: string;
  division: string;
  zilla: string;
  upazilla?: string | null;
  status?: string;
}) {
  const [existing] = await db.select().from(campuses).where(eq(campuses.slug, input.slug)).limit(1);
  if (!existing) {
    await db.insert(campuses).values({
      slug: input.slug,
      name: input.name,
      division: input.division,
      zilla: input.zilla,
      upazilla: input.upazilla || null,
      status: input.status || 'VERIFIED',
    });
  }
}

async function seed() {
  console.log('Seeding Chokro database...');
  const passwordHash = await hash(DEMO_PASSWORD, 10);

  // Seed baseline university campuses
  await upsertCampus({ slug: 'NSU', name: 'North South University', division: 'DHAKA', zilla: 'Dhaka', upazilla: 'Bashundhara R/A' });
  await upsertCampus({ slug: 'BRACU', name: 'BRAC University', division: 'DHAKA', zilla: 'Dhaka', upazilla: 'Mohakhali' });
  await upsertCampus({ slug: 'DU', name: 'University of Dhaka', division: 'DHAKA', zilla: 'Dhaka', upazilla: 'Shahbag' });

  // Demo accounts with institutional affiliation for inter-campus leaderboards
  const adminUser = await upsertUser('admin@chokro.org', 'ADMIN', passwordHash, 'NSU');
  const normalUser = await upsertUser('user@chokro.org', 'INDIVIDUAL', passwordHash, 'BRACU', { fullName: 'Demo Student', phone: '01700000000' });
  const partnerUser = await upsertUser('partner@chokro.org', 'PARTNER', passwordHash, 'DU');

  // Attach the demo partner user to a verified recycling org if absent
  const [existingPartner] = await db.select().from(partners).where(eq(partners.user_id, partnerUser.id));
  if (!existingPartner) {
    await db.insert(partners).values({
      user_id: partnerUser.id,
      org_name: 'BanglaBin Recycling Ltd',
      types: ['RECYCLER', 'COLLECTOR'],
      e_waste_licensed: true,
      doe_license_doc: 'DOE-LICENSE-2026-9912.pdf',
      status: 'VERIFIED',
      capability_flags: { collects: true, repairs: false, buys: true, accepts_donations: true },
    });
  }

  // Baseline rate card entries across the main categories
  const seedRates = [
    {
      category: 'PLASTICS',
      condition_band: 'GOOD',
      unit: 'kg',
      price_bdt: '45.00',
    },
    {
      category: 'CLOTHES',
      condition_band: 'FAIR',
      unit: 'kg',
      price_bdt: '30.00',
    },
    {
      category: 'E_WASTE',
      condition_band: 'GOOD',
      unit: 'piece',
      price_bdt: '250.00',
    },
  ] as const;

  // Insert each baseline rate only if an identical entry does not already exist
  for (const rate of seedRates) {
    const [existingRate] = await db.select().from(rateCardEntries).where(and(
      eq(rateCardEntries.category, rate.category),
      eq(rateCardEntries.condition_band, rate.condition_band),
      eq(rateCardEntries.unit, rate.unit),
    ));
    if (!existingRate) {
      await db.insert(rateCardEntries).values(rate);
    }
  }

  // Seed engagement streak for demo individual user
  const [existingStreak] = await db.select().from(userStreaks).where(eq(userStreaks.user_id, normalUser.id));
  if (!existingStreak) {
    await db.insert(userStreaks).values({
      user_id: normalUser.id,
      current_streak_days: 6,
      longest_streak_days: 6,
      streak_multiplier: '1.50',
      last_active_at: new Date(),
      leaderboard_opt_out: false,
    });
  }

  // Seed initial milestone badge for demo individual user
  const [existingBadge] = await db.select().from(badgeAwards).where(and(
    eq(badgeAwards.user_id, normalUser.id),
    eq(badgeAwards.badge_type, 'FIRST_VERIFIED_DEPOSIT'),
  ));
  if (!existingBadge) {
    await db.insert(badgeAwards).values({
      user_id: normalUser.id,
      badge_type: 'FIRST_VERIFIED_DEPOSIT',
      award_points: '50.00',
      meta: { amount: 50, campus: 'BRACU', note: 'First verified recycling deposit' },
    });
  }

  // Baseline snapshots across campus leaderboard periods
  const today = new Date().toISOString().slice(0, 10);
  const seedLeaderboards = [
    { period: 'WEEKLY', campus_id: 'BRACU', total_points: '450.00', member_count: 12, top_scorer_user_id: normalUser.id, snapshot_date: today },
    { period: 'WEEKLY', campus_id: 'NSU', total_points: '320.00', member_count: 8, top_scorer_user_id: adminUser.id, snapshot_date: today },
    { period: 'WEEKLY', campus_id: 'DU', total_points: '210.00', member_count: 5, top_scorer_user_id: null, snapshot_date: today },
    { period: 'MONTHLY', campus_id: 'BRACU', total_points: '1850.00', member_count: 25, top_scorer_user_id: normalUser.id, snapshot_date: today },
    { period: 'MONTHLY', campus_id: 'NSU', total_points: '1420.00', member_count: 19, top_scorer_user_id: adminUser.id, snapshot_date: today },
    { period: 'ALL_TIME', campus_id: 'BRACU', total_points: '5200.00', member_count: 45, top_scorer_user_id: normalUser.id, snapshot_date: today },
    { period: 'ALL_TIME', campus_id: 'NSU', total_points: '4100.00', member_count: 38, top_scorer_user_id: adminUser.id, snapshot_date: today },
  ] as const;

  for (const entry of seedLeaderboards) {
    const [existingEntry] = await db.select().from(campusLeaderboards).where(and(
      eq(campusLeaderboards.period, entry.period),
      eq(campusLeaderboards.campus_id, entry.campus_id),
    ));
    if (!existingEntry) {
      await db.insert(campusLeaderboards).values(entry);
    }
  }

  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
