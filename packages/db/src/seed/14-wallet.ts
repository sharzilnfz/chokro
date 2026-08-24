import { db, users, pickupOrders, creditTxns, liabilityCaps, redemptionRequests, payoutRecords } from '../index';
import { and, eq } from 'drizzle-orm';
// Seed scenario section 14 — moved verbatim from the original seed().
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { student1User, student2User, adminOrgUser } = ctx.users;
  const { deposit1, deposit4 } = ctx.deposits;
  const { decision1, decision2 } = ctx.decisions;
  const { pickupOrder3 } = ctx.pickupOrders;

  // =========================================================================
  // 14. WALLET, REDEMPTION & LIABILITY
  // =========================================================================
  // Liability Caps
  const [existingCap] = await db.select().from(liabilityCaps).limit(1);
  if (!existingCap) {
    await db.insert(liabilityCaps).values({
      monthly_platform_cap_bdt: '500000.00',
      monthly_user_cap_bdt: '25000.00',
      min_redemption_bdt: '300.00',
      fee_percentage: '1.85',
      effective_from: new Date(Date.now() - 30 * 86400_000),
      updated_by: adminOrgUser.id,
    });
  }

  // Credit Txns
  // Txn 1: Student 1 - 450 Verified
  const [existingTxn1] = await db.select().from(creditTxns).where(eq(creditTxns.custody_ref, deposit4.id)).limit(1);
  if (!existingTxn1) {
    await db.insert(creditTxns).values({
      user_id: student1User.id,
      amount: '450.00',
      kind: 'EARN',
      status: 'VERIFIED',
      source_id: 'DEPOSIT',
      custody_ref: deposit4.id,
      trust_decision_id: decision1.id,
      reason: 'Verified drop zone deposit (10kg Plastics)',
    });
  }

  // Txn 2: Student 1 - 189 Pending (SCENARIO 2)
  const [existingTxn2] = await db.select().from(creditTxns).where(eq(creditTxns.custody_ref, deposit1.id)).limit(1);
  if (!existingTxn2) {
    await db.insert(creditTxns).values({
      user_id: student1User.id,
      amount: '189.00',
      kind: 'EARN',
      status: 'PENDING',
      source_id: 'DEPOSIT',
      custody_ref: deposit1.id,
      reason: 'Drop zone deposit pending collector scale confirmation (4.2kg PET bottles)',
    });
  }

  // Txn 3: Student 2 - 850 Verified
  const [existingTxn3] = await db.select().from(creditTxns).where(eq(creditTxns.custody_ref, pickupOrder3.id)).limit(1);
  if (!existingTxn3) {
    await db.insert(creditTxns).values({
      user_id: student2User.id,
      amount: '850.00',
      kind: 'EARN',
      status: 'VERIFIED',
      source_id: 'PICKUP',
      custody_ref: pickupOrder3.id,
      trust_decision_id: decision2.id,
      reason: 'Verified pickup collection (5kg Copper Cables)',
    });
  }

  // Txn 4: Student 1 - 120 Pending extra
  const [existingTxn4] = await db.select().from(creditTxns).where(eq(creditTxns.custody_ref, 'DEP-PENDING-EXTRA-01')).limit(1);
  if (!existingTxn4) {
    await db.insert(creditTxns).values({
      user_id: student1User.id,
      amount: '120.00',
      kind: 'EARN',
      status: 'PENDING',
      source_id: 'DEPOSIT',
      custody_ref: 'DEP-PENDING-EXTRA-01',
      reason: 'Awaiting Trust Gate verification',
    });
  }

  // Txn 5: Student 2 - 500 Redeem
  const [existingTxn5] = await db.select().from(creditTxns).where(eq(creditTxns.custody_ref, 'RED-BKASH-001')).limit(1);
  if (!existingTxn5) {
    await db.insert(creditTxns).values({
      user_id: student2User.id,
      amount: '500.00',
      kind: 'REDEEM',
      status: 'VERIFIED',
      source_id: 'REDEMPTION',
      custody_ref: 'RED-BKASH-001',
      reason: 'bKash cash-out settlement',
    });
  }

  // Txn 6: Student 1 - 50 Adjust Bonus
  const [existingTxn6] = await db.select().from(creditTxns).where(eq(creditTxns.custody_ref, 'ADJUST-BONUS-001')).limit(1);
  if (!existingTxn6) {
    await db.insert(creditTxns).values({
      user_id: student1User.id,
      amount: '50.00',
      kind: 'ADJUST',
      status: 'VERIFIED',
      source_id: 'SYSTEM',
      custody_ref: 'ADJUST-BONUS-001',
      reason: 'First deposit welcome bonus',
    });
  }

  // Redemption Requests & Payout Records
  const [existingRedemption1] = await db
    .select()
    .from(redemptionRequests)
    .where(and(eq(redemptionRequests.user_id, student2User.id), eq(redemptionRequests.status, 'PAID')))
    .limit(1);
  let red1: typeof redemptionRequests.$inferSelect;
  if (existingRedemption1) {
    red1 = existingRedemption1;
  } else {
    const [inserted] = await db
      .insert(redemptionRequests)
      .values({
        user_id: student2User.id,
        amount_credits: '500.00',
        payout_channel: 'BKASH',
        account_number: '01722222222',
        gross_amount_bdt: '500.00',
        fee_bdt: '9.25',
        net_amount_bdt: '490.75',
        status: 'PAID',
      })
      .returning();
    red1 = inserted;

    await db.insert(payoutRecords).values({
      redemption_id: red1.id,
      gateway_ref: 'MFS-BKASH-TXN-984210',
      gateway_provider: 'SSLCOMMERZ_MFS',
      status: 'SUCCESS',
      payload: { provider: 'bKash', msisdn: '01722222222', amount: 490.75, settled_at: new Date().toISOString() },
    });
  }

  const [existingRedemption2] = await db
    .select()
    .from(redemptionRequests)
    .where(and(eq(redemptionRequests.user_id, student1User.id), eq(redemptionRequests.status, 'REQUESTED')))
    .limit(1);
  if (!existingRedemption2) {
    await db.insert(redemptionRequests).values({
      user_id: student1User.id,
      amount_credits: '350.00',
      payout_channel: 'BKASH',
      account_number: '01711111112',
      gross_amount_bdt: '350.00',
      fee_bdt: '6.48',
      net_amount_bdt: '343.52',
      status: 'REQUESTED',
    });
  }

}
