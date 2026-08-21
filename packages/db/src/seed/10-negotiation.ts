import { db, users, listings, negotiationThreads, negotiationOffers } from '../index';
import { and, eq } from 'drizzle-orm';
// Seed scenario section 10 — moved verbatim from the original seed().
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { buyerFarukUser, student1User } = ctx.users;
  const { listingCopper40kg } = ctx.listings;

  // =========================================================================
  // 10. SCENARIO 4: REAL-TIME COUNTER-OFFER NEGOTIATION (Buyer Faruk vs Seller)
  // =========================================================================
  const [existingThread] = await db
    .select()
    .from(negotiationThreads)
    .where(
      and(
        eq(negotiationThreads.listing_id, listingCopper40kg.id),
        eq(negotiationThreads.buyer_id, buyerFarukUser.id),
        eq(negotiationThreads.seller_id, student1User.id)
      )
    )
    .limit(1);

  let negThread: typeof negotiationThreads.$inferSelect;
  if (existingThread) {
    negThread = existingThread;
  } else {
    const [inserted] = await db
      .insert(negotiationThreads)
      .values({
        listing_id: listingCopper40kg.id,
        buyer_id: buyerFarukUser.id,
        seller_id: student1User.id,
        status: 'OPEN',
      })
      .returning();
    negThread = inserted;
  }

  // Offer 1: Buyer Faruk offered ৳700/kg (Total ৳28,000) - SUPERSEDED
  const [existingOffer1] = await db
    .select()
    .from(negotiationOffers)
    .where(and(eq(negotiationOffers.thread_id, negThread.id), eq(negotiationOffers.offered_by_user_id, buyerFarukUser.id)))
    .limit(1);

  if (!existingOffer1) {
    await db.insert(negotiationOffers).values({
      thread_id: negThread.id,
      offered_by_user_id: buyerFarukUser.id,
      offer_amount_bdt: '28000.00',
      offered_quantity: '40.00',
      unit: 'kg',
      status: 'SUPERSEDED',
      expires_at: new Date(Date.now() + 22 * 3600_000),
      notes: 'Can pick up tomorrow morning from Tejgaon warehouse.',
    });
  }

  // Offer 2: Seller countered with ৳740/kg (Total ৳29,600) - PENDING with 18h remaining
  const [existingOffer2] = await db
    .select()
    .from(negotiationOffers)
    .where(and(eq(negotiationOffers.thread_id, negThread.id), eq(negotiationOffers.offered_by_user_id, student1User.id)))
    .limit(1);

  let offer2Id: string;
  if (existingOffer2) {
    await db
      .update(negotiationOffers)
      .set({
        offer_amount_bdt: '29600.00',
        offered_quantity: '40.00',
        status: 'PENDING',
        expires_at: new Date(Date.now() + 18 * 3600_000),
      })
      .where(eq(negotiationOffers.id, existingOffer2.id));
    offer2Id = existingOffer2.id;
  } else {
    const [inserted] = await db
      .insert(negotiationOffers)
      .values({
        thread_id: negThread.id,
        offered_by_user_id: student1User.id,
        offer_amount_bdt: '29600.00',
        offered_quantity: '40.00',
        unit: 'kg',
        status: 'PENDING',
        expires_at: new Date(Date.now() + 18 * 3600_000),
        notes: 'High purity wire, ৳740 is my final price.',
      })
      .returning();
    offer2Id = inserted.id;
  }

  await db.update(negotiationThreads).set({ last_offer_id: offer2Id }).where(eq(negotiationThreads.id, negThread.id));

}
