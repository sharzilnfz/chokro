// Shared mutable state threaded through the per-scenario seed modules, plus
// the idempotent upsert helpers every scenario reuses.
import {
  db,
  users,
  campuses,
  partners,
  listings,
  dropZones,
  auctionLots,
  auctionBids,
  pickupOrders,
  depositRecords,
  trustDecisions,
  rateCardEntries,
} from '../index';
import { and, eq } from 'drizzle-orm';

export interface SeedContext {
  campuses: {
    bracuCampus: typeof campuses.$inferSelect;
  };
  users: {
    adminOrgUser: typeof users.$inferSelect;
    student1User: typeof users.$inferSelect;
    student2User: typeof users.$inferSelect;
    normalUser: typeof users.$inferSelect;
    partnerUser: typeof users.$inferSelect;
    collectorKorimUser: typeof users.$inferSelect;
    collector1User: typeof users.$inferSelect;
    collector2User: typeof users.$inferSelect;
    recyclerRahimUser: typeof users.$inferSelect;
    recycler1User: typeof users.$inferSelect;
    recycler2User: typeof users.$inferSelect;
    buyerFarukUser: typeof users.$inferSelect;
    electrofixUser: typeof users.$inferSelect;
    applicantPartnerUser: typeof users.$inferSelect;
  };
  partners: {
    partnerBengalCollector: typeof partners.$inferSelect;
    partnerDhakaRecycler: typeof partners.$inferSelect;
    partnerCollector1: typeof partners.$inferSelect;
    partnerCollector2: typeof partners.$inferSelect;
    partnerApplicant: typeof partners.$inferSelect;
  };
  seededRateMap: Map<string, typeof rateCardEntries.$inferSelect>;
  zones: {
    bracuZone: typeof dropZones.$inferSelect;
    buetZone: typeof dropZones.$inferSelect;
    nsuZone: typeof dropZones.$inferSelect;
  };
  listings: {
    listingCopper40kg: typeof listings.$inferSelect;
    listingCopper500kg: typeof listings.$inferSelect;
    listingPlastics: typeof listings.$inferSelect;
    listingPaper: typeof listings.$inferSelect;
    listingAppliance: typeof listings.$inferSelect;
    listingEwaste: typeof listings.$inferSelect;
    listingBooks: typeof listings.$inferSelect;
    listingClothes: typeof listings.$inferSelect;
  };
  lotEndedSold: typeof auctionLots.$inferSelect;
  pickupOrders: {
    pickupOrder1: typeof pickupOrders.$inferSelect;
    pickupOrder3: typeof pickupOrders.$inferSelect;
  };
  deposits: {
    deposit1: typeof depositRecords.$inferSelect;
    deposit2: typeof depositRecords.$inferSelect;
    deposit3: typeof depositRecords.$inferSelect;
    deposit4: typeof depositRecords.$inferSelect;
  };
  decisions: {
    decision1: typeof trustDecisions.$inferSelect;
    decision2: typeof trustDecisions.$inferSelect;
    decision4: typeof trustDecisions.$inferSelect;
  };
}

// Idempotent user insert-or-update keyed by email
export async function upsertUser(
  email: string,
  role: 'INDIVIDUAL' | 'PARTNER' | 'ADMIN',
  passwordHash: string,
  institutionId?: string | null,
  profile?: { fullName?: string; phone?: string; studentIdDoc?: string }
) {
  const [user] = await db
    .insert(users)
    .values({
      email,
      password_hash: passwordHash,
      role,
      institution_id: institutionId || null,
      full_name: profile?.fullName,
      phone: profile?.phone,
      student_id_doc: profile?.studentIdDoc,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        password_hash: passwordHash,
        role,
        ...(institutionId !== undefined ? { institution_id: institutionId } : {}),
        ...(profile?.fullName ? { full_name: profile.fullName } : {}),
        ...(profile?.phone ? { phone: profile.phone } : {}),
        ...(profile?.studentIdDoc ? { student_id_doc: profile.studentIdDoc } : {}),
      },
    })
    .returning();
  return user;
}

// Idempotent campus insert keyed on slug
export async function upsertCampus(input: {
  slug: string;
  name: string;
  division: string;
  zilla: string;
  upazilla?: string | null;
  status?: string;
}) {
  const [existing] = await db.select().from(campuses).where(eq(campuses.slug, input.slug)).limit(1);
  if (existing) {
    const [updated] = await db
      .update(campuses)
      .set({
        name: input.name,
        division: input.division,
        zilla: input.zilla,
        upazilla: input.upazilla || null,
        status: input.status || 'VERIFIED',
      })
      .where(eq(campuses.id, existing.id))
      .returning();
    return updated;
  }
  const [inserted] = await db
    .insert(campuses)
    .values({
      slug: input.slug,
      name: input.name,
      division: input.division,
      zilla: input.zilla,
      upazilla: input.upazilla || null,
      status: input.status || 'VERIFIED',
    })
    .returning();
  return inserted;
}

type AuctionBidSpec = { bidderUserId: string; amount: string; minutesAgo: number };

export async function ensureAuctionLot(spec: {
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
      await db
        .update(auctionLots)
        .set({
          opens_at: new Date(Date.now() - spec.refreshWindow.opensMinutesAgo * 60_000),
          closes_at: new Date(Date.now() + spec.refreshWindow.closesMinutesFromNow * 60_000),
          status: spec.lot.status,
          updated_at: new Date(),
        })
        .where(eq(auctionLots.id, existing.id));

      for (const bid of await db.select().from(auctionBids).where(eq(auctionBids.lot_id, existing.id))) {
        const match = spec.bids[Math.min(bid.bid_number, spec.bids.length) - 1];
        if (match) {
          await db
            .update(auctionBids)
            .set({ received_at: new Date(Date.now() - match.minutesAgo * 60_000) })
            .where(eq(auctionBids.id, bid.id));
        }
      }
    }
    return existing;
  }

  const [lot] = await db.insert(auctionLots).values(spec.lot).returning();
  const insertedBids: Array<typeof auctionBids.$inferSelect> = [];
  for (let i = 0; i < spec.bids.length; i++) {
    const bid = spec.bids[i];
    const [inserted] = await db
      .insert(auctionBids)
      .values({
        lot_id: lot.id,
        bidder_user_id: bid.bidderUserId,
        amount_bdt: bid.amount,
        bid_number: i + 1,
        received_at: new Date(Date.now() - bid.minutesAgo * 60_000),
      })
      .returning();
    insertedBids.push(inserted);
  }
  if (spec.winningBid && insertedBids.length > 0) {
    const winner = insertedBids[insertedBids.length - 1];
    await db.update(auctionLots).set({ winning_bid_id: winner.id }).where(eq(auctionLots.id, lot.id));
  }
  return lot;
}
