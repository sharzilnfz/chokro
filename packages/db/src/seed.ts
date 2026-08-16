import { db, users, partners, rateCardEntries, rateBenchmarks } from './index';
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
    { category: 'PLASTICS', condition_band: 'GOOD', unit: 'kg', price_bdt: '45.00' },
    { category: 'PLASTICS', condition_band: 'EXCELLENT', unit: 'kg', price_bdt: '55.00' },
    { category: 'PLASTICS', condition_band: 'FAIR', unit: 'kg', price_bdt: '35.00' },
    { category: 'PLASTICS', condition_band: 'POOR', unit: 'kg', price_bdt: '20.00' },
    { category: 'METAL', condition_band: 'GOOD', unit: 'kg', price_bdt: '110.00' },
    { category: 'METAL', condition_band: 'EXCELLENT', unit: 'kg', price_bdt: '140.00' },
    { category: 'E_WASTE', condition_band: 'GOOD', unit: 'piece', price_bdt: '250.00' },
    { category: 'E_WASTE', condition_band: 'EXCELLENT', unit: 'piece', price_bdt: '350.00' },
    { category: 'PAPER', condition_band: 'GOOD', unit: 'kg', price_bdt: '25.00' },
    { category: 'GLASS', condition_band: 'GOOD', unit: 'kg', price_bdt: '18.00' },
    { category: 'CLOTHES', condition_band: 'GOOD', unit: 'kg', price_bdt: '30.00' },
    { category: 'CLOTHES', condition_band: 'FAIR', unit: 'kg', price_bdt: '20.00' },
    { category: 'BOOKS', condition_band: 'GOOD', unit: 'kg', price_bdt: '35.00' },
    { category: 'FURNITURE', condition_band: 'GOOD', unit: 'kg', price_bdt: '95.00' },
    { category: 'APPLIANCES', condition_band: 'GOOD', unit: 'piece', price_bdt: '500.00' },
    { category: 'APPLIANCES', condition_band: 'EXCELLENT', unit: 'piece', price_bdt: '750.00' },
  ] as const;

  for (const rate of seedRates) {
    const [existingRate] = await db.select().from(rateCardEntries).where(and(
      eq(rateCardEntries.category, rate.category),
      eq(rateCardEntries.condition_band, rate.condition_band),
      eq(rateCardEntries.unit, rate.unit),
    ));
    if (!existingRate) {
      await db.insert(rateCardEntries).values({
        ...rate,
        effective_from: new Date(Date.now() - 3600000),
      });
    }
  }

  const seedBenchmarks = [
    { category: 'METAL', commodity_symbol: 'LME-SCRAP-METAL', global_price_usd: '0.95', fx_rate_usd_bdt: '122.50', benchmark_bdt: '116.38', source: 'LME Scrap Metal Composite' },
    { category: 'PLASTICS', commodity_symbol: 'PET-PLASTIC-IDX', global_price_usd: '0.38', fx_rate_usd_bdt: '122.50', benchmark_bdt: '46.55', source: 'Global Polyethylene/PET Index' },
    { category: 'PAPER', commodity_symbol: 'PULP-PAPER-IDX', global_price_usd: '0.22', fx_rate_usd_bdt: '122.50', benchmark_bdt: '26.95', source: 'Global Recovered Paper Index' },
    { category: 'GLASS', commodity_symbol: 'CULLET-GLASS-IDX', global_price_usd: '0.15', fx_rate_usd_bdt: '122.50', benchmark_bdt: '18.38', source: 'Cullet Glass Composite' },
    { category: 'E_WASTE', commodity_symbol: 'EWASTE-PCB-METALS', global_price_usd: '2.10', fx_rate_usd_bdt: '122.50', benchmark_bdt: '257.25', source: 'Precious E-Waste Scrap Index' },
    { category: 'CLOTHES', commodity_symbol: 'TEXTILE-RECYCLE', global_price_usd: '0.28', fx_rate_usd_bdt: '122.50', benchmark_bdt: '34.30', source: 'Global Recycled Textile Feed' },
    { category: 'BOOKS', commodity_symbol: 'PRINT-PAPER-PULP', global_price_usd: '0.25', fx_rate_usd_bdt: '122.50', benchmark_bdt: '30.63', source: 'Recovered Print Pulp Feed' },
    { category: 'FURNITURE', commodity_symbol: 'WOOD-COMPOSITE', global_price_usd: '0.80', fx_rate_usd_bdt: '122.50', benchmark_bdt: '98.00', source: 'Reclaimed Timber & Furniture Index' },
    { category: 'APPLIANCES', commodity_symbol: 'APPLIANCE-SCRAP', global_price_usd: '4.50', fx_rate_usd_bdt: '122.50', benchmark_bdt: '551.25', source: 'Major Appliance Recovery Feed' },
  ];

  for (const bm of seedBenchmarks) {
    const [existingBm] = await db.select().from(rateBenchmarks).where(eq(rateBenchmarks.category, bm.category));
    if (!existingBm) {
      await db.insert(rateBenchmarks).values(bm);
    }
  }

  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
