import { db, users, listings, buyerDemands, demandMatches } from '../index';
import { and, eq } from 'drizzle-orm';
// Seed scenario section 09 — moved verbatim from the original seed().
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { recyclerRahimUser } = ctx.users;
  const { listingCopper40kg, listingCopper500kg } = ctx.listings;

  // =========================================================================
  // 9. SCENARIO 5: REVERSE DEMAND AUTO-MATCH (Recycler Rahim 500kg Copper)
  // =========================================================================
  const [existingDemand] = await db
    .select()
    .from(buyerDemands)
    .where(and(eq(buyerDemands.buyer_id, recyclerRahimUser.id), eq(buyerDemands.category, 'METAL')))
    .limit(1);

  let demandRahim: typeof buyerDemands.$inferSelect;
  if (existingDemand) {
    const [updated] = await db
      .update(buyerDemands)
      .set({
        min_quantity: '500.00',
        max_quantity: '1000.00',
        unit: 'kg',
        max_price_per_unit_bdt: '750.00',
        target_thana: 'Tejgaon',
        target_lat: 23.7600,
        target_lng: 90.3900,
        max_radius_km: 15,
        status: 'ACTIVE',
        expires_at: new Date(Date.now() + 30 * 86400_000),
      })
      .where(eq(buyerDemands.id, existingDemand.id))
      .returning();
    demandRahim = updated;
  } else {
    const [inserted] = await db
      .insert(buyerDemands)
      .values({
        buyer_id: recyclerRahimUser.id,
        category: 'METAL',
        min_quantity: '500.00',
        max_quantity: '1000.00',
        unit: 'kg',
        max_price_per_unit_bdt: '750.00',
        target_thana: 'Tejgaon',
        target_lat: 23.7600,
        target_lng: 90.3900,
        max_radius_km: 15,
        status: 'ACTIVE',
        expires_at: new Date(Date.now() + 30 * 86400_000),
      })
      .returning();
    demandRahim = inserted;
  }

  // Seed 2 demand matches
  const match1Check = await db
    .select()
    .from(demandMatches)
    .where(and(eq(demandMatches.demand_id, demandRahim.id), eq(demandMatches.listing_id, listingCopper40kg.id)))
    .limit(1);
  if (match1Check.length === 0) {
    await db.insert(demandMatches).values({
      demand_id: demandRahim.id,
      listing_id: listingCopper40kg.id,
      match_score: '0.95',
      distance_km: '1.20',
      notification_sent: true,
      status: 'UNNOTICED',
    });
  }

  const match2Check = await db
    .select()
    .from(demandMatches)
    .where(and(eq(demandMatches.demand_id, demandRahim.id), eq(demandMatches.listing_id, listingCopper500kg.id)))
    .limit(1);
  if (match2Check.length === 0) {
    await db.insert(demandMatches).values({
      demand_id: demandRahim.id,
      listing_id: listingCopper500kg.id,
      match_score: '0.98',
      distance_km: '0.80',
      notification_sent: true,
      status: 'VIEWED',
    });
  }

}
