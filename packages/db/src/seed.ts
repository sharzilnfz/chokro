import { db, users, partners, listings, pickupOrders, dispatchAssignments, rateCardEntries, rateBenchmarks } from './index';
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
  const demoUser = await upsertUser('user@chokro.org', 'INDIVIDUAL', passwordHash);
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

  // Geo-dispatch demo collectors: dedicated van/trike fleets with Dhaka bases.
  // Collector 1 is e-waste licensed with the larger vehicle; collector 2 is not licensed.
  const collectorSpecs = [
    {
      email: 'collector1@chokro.org',
      org_name: 'Dhanmondi Eco Vans',
      vehicle_label: 'Pickup van',
      vehicle_capacity_kg: '500.00',
      base_lat: 23.7806,
      base_lng: 90.4192,
      service_radius_km: 12,
      e_waste_licensed: true,
      doe_license_doc: 'DOE-LICENSE-2026-4417.pdf',
    },
    {
      email: 'collector2@chokro.org',
      org_name: 'Savar Cargo Trikes',
      vehicle_label: 'Cargo trike',
      vehicle_capacity_kg: '150.00',
      base_lat: 23.7481,
      base_lng: 90.3765,
      service_radius_km: 10,
      e_waste_licensed: false,
      doe_license_doc: null,
    },
  ];

  const seededCollectors: Array<typeof partners.$inferSelect> = [];
  for (const spec of collectorSpecs) {
    const collectorUser = await upsertUser(spec.email, 'PARTNER', passwordHash);
    const [existingCollector] = await db.select().from(partners).where(eq(partners.user_id, collectorUser.id));
    if (existingCollector) {
      seededCollectors.push(existingCollector);
      continue;
    }
    const [inserted] = await db.insert(partners).values({
      user_id: collectorUser.id,
      org_name: spec.org_name,
      types: ['COLLECTOR'],
      e_waste_licensed: spec.e_waste_licensed,
      doe_license_doc: spec.doe_license_doc,
      status: 'VERIFIED',
      vehicle_label: spec.vehicle_label,
      vehicle_capacity_kg: spec.vehicle_capacity_kg,
      base_lat: spec.base_lat,
      base_lng: spec.base_lng,
      service_radius_km: spec.service_radius_km,
    }).returning();
    seededCollectors.push(inserted);
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

  // Geo-dispatch demo data: ACTIVE listings for the demo user plus two pickup orders —
  // one ASSIGNED to the Dhanmondi van (with a dispatch assignment row) near its base,
  // one still REQUESTED near the Savar trike base.
  let demoListings = await db.select().from(listings).where(and(
    eq(listings.owner_id, demoUser.id),
    eq(listings.status, 'ACTIVE'),
  ));

  if (demoListings.length === 0) {
    await db.insert(listings).values([
      { owner_id: demoUser.id, category: 'PLASTICS', unit: 'kg', declared_weight: '12.50', declared_condition: 'GOOD', status: 'ACTIVE' },
      { owner_id: demoUser.id, category: 'PAPER', unit: 'kg', declared_weight: '8.00', declared_condition: 'FAIR', status: 'ACTIVE' },
    ]);
    demoListings = await db.select().from(listings).where(and(
      eq(listings.owner_id, demoUser.id),
      eq(listings.status, 'ACTIVE'),
    ));
  }

  const [existingPickup] = await db.select().from(pickupOrders).where(eq(pickupOrders.customer_id, demoUser.id)).limit(1);
  if (!existingPickup && demoListings.length >= 2 && seededCollectors.length >= 1) {
    const vanCollector = seededCollectors[0];
    const [assignedOrder] = await db.insert(pickupOrders).values({
      listing_id: demoListings[0].id,
      customer_id: demoUser.id,
      collector_partner_id: vanCollector.id,
      status: 'ASSIGNED',
      address: 'House 12, Road 5, Dhanmondi, Dhaka',
      lat: 23.7820,
      lng: 90.4205,
      scheduled_for: new Date(Date.now() + 2 * 3600_000),
      notes: 'Ring the bell twice, gate is on Road 5',
    }).returning();

    // Haversine distance from the van base (23.7806, 90.4192) to this stop.
    await db.insert(dispatchAssignments).values({
      order_id: assignedOrder.id,
      collector_partner_id: vanCollector.id,
      stop_sequence: 1,
      distance_km: '0.20',
      eta_minutes: 1,
    });

    await db.insert(pickupOrders).values({
      listing_id: demoListings[1].id,
      customer_id: demoUser.id,
      collector_partner_id: null,
      status: 'REQUESTED',
      address: 'Flat 4B, House 27, Ring Road, Shyamoli, Dhaka',
      lat: 23.7495,
      lng: 90.3780,
      scheduled_for: new Date(Date.now() + 26 * 3600_000),
      notes: null,
    });
  }

  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
