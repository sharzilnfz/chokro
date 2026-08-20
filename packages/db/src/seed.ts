// Seeds local development data: demo accounts per role, partner orgs, baseline rates, commodity benchmarks, pickup routes, auction lots, and campus leaderboards.
import {
  db,
  users,
  partners,
  listings,
  pickupOrders,
  dispatchAssignments,
  rateCardEntries,
  rateBenchmarks,
  auctionLots,
  auctionBids,
  userStreaks,
  badgeAwards,
  campusLeaderboards,
  campuses,
} from './index';
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

type AuctionBidSpec = { bidderUserId: string; amount: string; minutesAgo: number };

/**
 * Creates a demo auction lot with its bid history when missing. LIVE lots
 * (refreshWindow set) get their window — and their bids' ages — refreshed on
 * re-seed so the live-bidding demo is always mid-auction.
 */
async function ensureAuctionLot(spec: {
  lot: typeof auctionLots.$inferInsert;
  bids: AuctionBidSpec[];
  refreshWindow?: { opensMinutesAgo: number; closesMinutesFromNow: number };
  winningBid?: boolean;
}) {
  const [existing] = await db
    .select()
    .from(auctionLots)
    .where(and(eq(auctionLots.created_by, spec.lot.created_by), eq(auctionLots.title, spec.lot.title)))
    .limit(1);

  if (existing) {
    if (spec.refreshWindow) {
      await db.update(auctionLots).set({
        opens_at: new Date(Date.now() - spec.refreshWindow.opensMinutesAgo * 60_000),
        closes_at: new Date(Date.now() + spec.refreshWindow.closesMinutesFromNow * 60_000),
        updated_at: new Date(),
      }).where(eq(auctionLots.id, existing.id));
      for (const bid of await db.select().from(auctionBids).where(eq(auctionBids.lot_id, existing.id))) {
        const match = spec.bids[Math.min(bid.bid_number, spec.bids.length) - 1];
        if (match) {
          await db.update(auctionBids)
            .set({ received_at: new Date(Date.now() - match.minutesAgo * 60_000) })
            .where(eq(auctionBids.id, bid.id));
        }
      }
    }
    return;
  }

  const [lot] = await db.insert(auctionLots).values(spec.lot).returning();
  const insertedBids: Array<typeof auctionBids.$inferSelect> = [];
  for (let i = 0; i < spec.bids.length; i++) {
    const bid = spec.bids[i];
    const [inserted] = await db.insert(auctionBids).values({
      lot_id: lot.id,
      bidder_user_id: bid.bidderUserId,
      amount_bdt: bid.amount,
      bid_number: i + 1,
      received_at: new Date(Date.now() - bid.minutesAgo * 60_000),
    }).returning();
    insertedBids.push(inserted);
  }
  if (spec.winningBid && insertedBids.length > 0) {
    const winner = insertedBids[insertedBids.length - 1];
    await db.update(auctionLots).set({ winning_bid_id: winner.id }).where(eq(auctionLots.id, lot.id));
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

  // Baseline rate card entries across the main categories
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

  // Insert each baseline rate only if an identical entry does not already exist
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
    eq(listings.owner_id, normalUser.id),
    eq(listings.status, 'ACTIVE'),
  ));

  if (demoListings.length === 0) {
    await db.insert(listings).values([
      { owner_id: normalUser.id, category: 'PLASTICS', unit: 'kg', declared_weight: '12.50', declared_condition: 'GOOD', price_bdt: '562.50', status: 'ACTIVE' },
      { owner_id: normalUser.id, category: 'PAPER', unit: 'kg', declared_weight: '8.00', declared_condition: 'FAIR', price_bdt: '160.00', status: 'ACTIVE' },
    ]);
    demoListings = await db.select().from(listings).where(and(
      eq(listings.owner_id, normalUser.id),
      eq(listings.status, 'ACTIVE'),
    ));
  }

  const [existingPickup] = await db.select().from(pickupOrders).where(eq(pickupOrders.customer_id, normalUser.id)).limit(1);
  if (!existingPickup && demoListings.length >= 2 && seededCollectors.length >= 1) {
    const vanCollector = seededCollectors[0];
    const [assignedOrder] = await db.insert(pickupOrders).values({
      listing_id: demoListings[0].id,
      customer_id: normalUser.id,
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
      customer_id: normalUser.id,
      collector_partner_id: null,
      status: 'REQUESTED',
      address: 'Flat 4B, House 27, Ring Road, Shyamoli, Dhaka',
      lat: 23.7495,
      lng: 90.3780,
      scheduled_for: new Date(Date.now() + 26 * 3600_000),
      notes: null,
    });
  }

  // F4 live auction demo: two VERIFIED recyclers who trade bids on bulk lots
  // posted by BanglaBin Recycling (the existing partner@chokro.org account).
  const recyclerSpecs = [
    { email: 'recycler1@chokro.org', org_name: 'Dhaka Steel Recyclers' },
    { email: 'recycler2@chokro.org', org_name: 'Narayanganj Metal Works' },
  ];

  const seededRecyclers: Array<typeof users.$inferSelect> = [];
  for (const spec of recyclerSpecs) {
    const recyclerUser = await upsertUser(spec.email, 'PARTNER', passwordHash);
    const [existingRecycler] = await db.select().from(partners).where(eq(partners.user_id, recyclerUser.id));
    if (!existingRecycler) {
      await db.insert(partners).values({
        user_id: recyclerUser.id,
        org_name: spec.org_name,
        types: ['RECYCLER'],
        status: 'VERIFIED',
      });
    }
    seededRecyclers.push(recyclerUser);
  }

  if (seededRecyclers.length >= 2) {
    const [recyclerOne, recyclerTwo] = seededRecyclers;

    // LOT A — LIVE, closing ~45 min out: both recyclers trade the lead and the
    // sealed reserve is already met (highest bid ৳22,400 vs sealed ৳22,000).
    await ensureAuctionLot({
      lot: {
        title: 'Baled PET plastic — campus sorting drive',
        description: 'Clean, colour-sorted PET bales from a month-long university sorting programme. Ready to ship on pallets.',
        category: 'PLASTICS',
        quantity_kg: '450.00',
        starting_price_bdt: '18000.00',
        reserve_price_bdt: '22000.00',
        origin_label: 'University of Dhaka campus',
        status: 'LIVE',
        opens_at: new Date(Date.now() - 15 * 60_000),
        closes_at: new Date(Date.now() + 45 * 60_000),
        created_by: partnerUser.id,
      },
      bids: [
        { bidderUserId: recyclerOne.id, amount: '18050.00', minutesAgo: 12 },
        { bidderUserId: recyclerTwo.id, amount: '18200.00', minutesAgo: 10 },
        { bidderUserId: recyclerOne.id, amount: '18500.00', minutesAgo: 8 },
        { bidderUserId: recyclerTwo.id, amount: '19000.00', minutesAgo: 6 },
        { bidderUserId: recyclerOne.id, amount: '21500.00', minutesAgo: 4 },
        { bidderUserId: recyclerTwo.id, amount: '22400.00', minutesAgo: 2 },
      ],
      refreshWindow: { opensMinutesAgo: 15, closesMinutesFromNow: 45 },
    });

    // LOT B — LIVE, closing ~5 min out with no bids yet: the anti-snipe demo
    // target (any accepted bid from here extends the close by two minutes).
    await ensureAuctionLot({
      lot: {
        title: 'Mixed ferrous scrap — factory clear-out',
        description: 'Compressed MSAL offcuts, gates and shelving from a full floor clear-out. Sorted, dry, under cover.',
        category: 'METAL',
        quantity_kg: '800.00',
        starting_price_bdt: '40000.00',
        reserve_price_bdt: '52345.00',
        origin_label: 'Narayanganj EPZ',
        status: 'LIVE',
        opens_at: new Date(Date.now() - 25 * 60_000),
        closes_at: new Date(Date.now() + 5 * 60_000),
        created_by: partnerUser.id,
      },
      bids: [],
      refreshWindow: { opensMinutesAgo: 25, closesMinutesFromNow: 5 },
    });

    // LOT C — ENDED, sold above the sealed reserve (winning bid ৳15,100 vs ৳15,000).
    await ensureAuctionLot({
      lot: {
        title: 'Cullet glass — bottling plant line purge',
        description: 'Crushed flint and amber cullet from a beverage line changeover, contamination screened.',
        category: 'GLASS',
        quantity_kg: '1200.00',
        starting_price_bdt: '12000.00',
        reserve_price_bdt: '15000.00',
        origin_label: 'Gazipur beverage plant',
        status: 'ENDED',
        opens_at: new Date(Date.now() - 26 * 3600_000),
        closes_at: new Date(Date.now() - 2 * 3600_000),
        created_by: partnerUser.id,
      },
      bids: [
        { bidderUserId: recyclerOne.id, amount: '12050.00', minutesAgo: 25 * 60 },
        { bidderUserId: recyclerTwo.id, amount: '13000.00', minutesAgo: 24 * 60 },
        { bidderUserId: recyclerOne.id, amount: '15100.00', minutesAgo: 2 * 60 + 10 },
      ],
      winningBid: true,
    });

    // LOT D — ENDED, no sale: the only bid stayed below the sealed reserve.
    await ensureAuctionLot({
      lot: {
        title: 'Cardboard bales — retail chain backrooms',
        description: 'OCC bales collected across six retail backrooms. Some tape residue.',
        category: 'PAPER',
        quantity_kg: '950.00',
        starting_price_bdt: '8000.00',
        reserve_price_bdt: '10500.00',
        origin_label: 'Banani retail strip',
        status: 'ENDED',
        opens_at: new Date(Date.now() - 50 * 3600_000),
        closes_at: new Date(Date.now() - 26 * 3600_000),
        created_by: partnerUser.id,
      },
      bids: [
        { bidderUserId: recyclerTwo.id, amount: '8050.00', minutesAgo: 27 * 60 },
      ],
    });
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
