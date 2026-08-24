import { db, users, partners, listings, pickupOrders, dispatchAssignments, custodyHandovers } from '../index';
import { and, eq } from 'drizzle-orm';
// Seed scenario section 12 — moved verbatim from the original seed().
import crypto from 'crypto';
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { normalUser, student2User } = ctx.users;
  const { partnerCollector1, partnerBengalCollector } = ctx.partners;
  const { listingPlastics, listingPaper, listingClothes } = ctx.listings;

  // =========================================================================
  // 12. LOGISTICS: PICKUP ORDERS, DISPATCH & OTP CHALLENGE
  // =========================================================================
  // Order 1: Assigned to Dhanmondi van (with OTP Challenge active)
  const [existingOrder1] = await db
    .select()
    .from(pickupOrders)
    .where(and(eq(pickupOrders.customer_id, normalUser.id), eq(pickupOrders.status, 'ASSIGNED')))
    .limit(1);

  let pickupOrder1: typeof pickupOrders.$inferSelect;
  if (existingOrder1) {
    pickupOrder1 = existingOrder1;
  } else {
    const [inserted] = await db
      .insert(pickupOrders)
      .values({
        listing_id: listingPlastics.id,
        customer_id: normalUser.id,
        collector_partner_id: partnerCollector1.id,
        status: 'ASSIGNED',
        source_type: 'LISTING',
        address: 'House 12, Road 5, Dhanmondi, Dhaka',
        lat: 23.7820,
        lng: 90.4205,
        scheduled_for: new Date(Date.now() + 2 * 3600_000),
        notes: 'Ring the bell twice, gate is on Road 5',
      })
      .returning();
    pickupOrder1 = inserted;

    await db.insert(dispatchAssignments).values({
      order_id: pickupOrder1.id,
      collector_partner_id: partnerCollector1.id,
      stop_sequence: 1,
      distance_km: '0.20',
      eta_minutes: 1,
    });
  }

  // Order 2: Requested
  const [existingOrder2] = await db
    .select()
    .from(pickupOrders)
    .where(and(eq(pickupOrders.customer_id, normalUser.id), eq(pickupOrders.status, 'REQUESTED')))
    .limit(1);
  if (!existingOrder2) {
    await db.insert(pickupOrders).values({
      listing_id: listingPaper.id,
      customer_id: normalUser.id,
      status: 'REQUESTED',
      source_type: 'LISTING',
      address: 'Flat 4B, House 27, Ring Road, Shyamoli, Dhaka',
      lat: 23.7495,
      lng: 90.3780,
      scheduled_for: new Date(Date.now() + 26 * 3600_000),
    });
  }

  // Order 3: Collected (Shahbagh)
  const [existingOrder3] = await db
    .select()
    .from(pickupOrders)
    .where(and(eq(pickupOrders.customer_id, student2User.id), eq(pickupOrders.status, 'COLLECTED')))
    .limit(1);
  let pickupOrder3: typeof pickupOrders.$inferSelect;
  if (existingOrder3) {
    pickupOrder3 = existingOrder3;
  } else {
    const [inserted] = await db
      .insert(pickupOrders)
      .values({
        listing_id: listingClothes.id,
        customer_id: student2User.id,
        collector_partner_id: partnerBengalCollector.id,
        status: 'COLLECTED',
        source_type: 'LISTING',
        address: 'Shahbagh Campus Gate 2, Dhaka',
        lat: 23.7340,
        lng: 90.3928,
        scheduled_for: new Date(Date.now() - 4 * 3600_000),
      })
      .returning();
    pickupOrder3 = inserted;
  }

  // Custody Handover 1: Active 6-digit OTP challenge ('384912') ready for live demo
  const [existingHandover1] = await db
    .select()
    .from(custodyHandovers)
    .where(eq(custodyHandovers.task_id, pickupOrder1.id))
    .limit(1);
  const otpHash1 = crypto.createHash('sha256').update('384912').digest('hex');
  if (existingHandover1) {
    await db
      .update(custodyHandovers)
      .set({
        otp_code_hash: otpHash1,
        status: 'PENDING',
        expires_at: new Date(Date.now() + 15 * 60_000),
      })
      .where(eq(custodyHandovers.id, existingHandover1.id));
  } else {
    await db.insert(custodyHandovers).values({
      task_id: pickupOrder1.id,
      otp_code_hash: otpHash1,
      giver_user_id: normalUser.id,
      collector_partner_id: partnerCollector1.id,
      status: 'PENDING',
      expires_at: new Date(Date.now() + 15 * 60_000),
    });
  }

  // Custody Handover 2: Confirmed handover
  const [existingHandover2] = await db
    .select()
    .from(custodyHandovers)
    .where(eq(custodyHandovers.task_id, pickupOrder3.id))
    .limit(1);
  if (!existingHandover2) {
    await db.insert(custodyHandovers).values({
      task_id: pickupOrder3.id,
      otp_code_hash: crypto.createHash('sha256').update('123456').digest('hex'),
      giver_user_id: student2User.id,
      collector_partner_id: partnerBengalCollector.id,
      status: 'CONFIRMED',
      expires_at: new Date(Date.now() - 4 * 3600_000),
      confirmed_at: new Date(Date.now() - 4 * 3600_000),
    });
  }

  ctx.pickupOrders.pickupOrder1 = pickupOrder1;
  ctx.pickupOrders.pickupOrder3 = pickupOrder3;
}
