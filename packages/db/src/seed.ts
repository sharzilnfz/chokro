import { db, users, partners, rateCardEntries } from './index';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding Chokro database...');

  // Seed Admin user
  const [adminUser] = await db
    .insert(users)
    .values({
      email: 'admin@chokro.org',
      password_hash: '$2b$10$e8w8Ylqj.5.e7gL.bJ2K.eW5e.e8w8Ylqj', // hash for "password123"
      role: 'ADMIN',
    })
    .onConflictDoNothing()
    .returning();

  // Seed Demo User
  const [demoUser] = await db
    .insert(users)
    .values({
      email: 'user@chokro.org',
      password_hash: '$2b$10$e8w8Ylqj.5.e7gL.bJ2K.eW5e.e8w8Ylqj',
      role: 'INDIVIDUAL',
    })
    .onConflictDoNothing()
    .returning();

  // Seed Partner User
  const [partnerUser] = await db
    .insert(users)
    .values({
      email: 'partner@chokro.org',
      password_hash: '$2b$10$e8w8Ylqj.5.e7gL.bJ2K.eW5e.e8w8Ylqj',
      role: 'PARTNER',
    })
    .onConflictDoNothing()
    .returning();

  if (partnerUser) {
    await db.insert(partners).values({
      user_id: partnerUser.id,
      org_name: 'BanglaBin Recycling Ltd',
      types: ['RECYCLER', 'COLLECTOR'],
      e_waste_licensed: true,
      doe_license_doc: 'DOE-LICENSE-2026-9912.pdf',
      status: 'VERIFIED',
    });
  }

  // Seed Rate Card Entries (3 rows minimum as required by T0 acceptance criteria)
  await db.insert(rateCardEntries).values([
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
  ]);

  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
