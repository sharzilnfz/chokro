import { db, users, partners, rateCardEntries } from './index';
import { and, eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';

// Local demo accounts only. Never reuse this password outside local development.
const DEMO_PASSWORD = 'password123';

async function upsertUser(email: string, role: 'INDIVIDUAL' | 'PARTNER' | 'ADMIN', passwordHash: string) {
  const [user] = await db
    .insert(users)
    .values({ email, password_hash: passwordHash, role })
    .onConflictDoUpdate({
      target: users.email,
      set: { password_hash: passwordHash, role },
    })
    .returning();
  return user;
}

async function seed() {
  console.log('Seeding Chokro database...');
  const passwordHash = await hash(DEMO_PASSWORD, 10);

  await upsertUser('admin@chokro.org', 'ADMIN', passwordHash);
  await upsertUser('user@chokro.org', 'INDIVIDUAL', passwordHash);
  const partnerUser = await upsertUser('partner@chokro.org', 'PARTNER', passwordHash);

  const [existingPartner] = await db.select().from(partners).where(eq(partners.user_id, partnerUser.id));
  if (!existingPartner) {
    await db.insert(partners).values({
      user_id: partnerUser.id,
      org_name: 'BanglaBin Recycling Ltd',
      types: ['RECYCLER', 'COLLECTOR'],
      e_waste_licensed: true,
      doe_license_doc: 'DOE-LICENSE-2026-9912.pdf',
      status: 'VERIFIED',
    });
  }

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

  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
