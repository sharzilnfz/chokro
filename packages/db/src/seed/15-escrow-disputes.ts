import { db, users, escrowHolds, disputes } from '../index';
import { and, eq } from 'drizzle-orm';
// Seed scenario section 15 — moved verbatim from the original seed().
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { partnerUser, recycler1User, student1User, adminOrgUser } = ctx.users;
  const { lotEndedSold } = ctx;
  const { deposit2 } = ctx.deposits;

  // =========================================================================
  // 15. ESCROW HOLDS & DISPUTES
  // =========================================================================
  const [existingEscrow] = await db
    .select()
    .from(escrowHolds)
    .where(and(eq(escrowHolds.lot_id, lotEndedSold.id), eq(escrowHolds.buyer_id, recycler1User.id)))
    .limit(1);
  if (existingEscrow) {
    await db
      .update(escrowHolds)
      .set({ inspection_expires_at: new Date(Date.now() + 48 * 3600_000) })
      .where(eq(escrowHolds.id, existingEscrow.id));
  } else {
    await db.insert(escrowHolds).values({
      lot_id: lotEndedSold.id,
      buyer_id: recycler1User.id,
      seller_id: partnerUser.id,
      amount_bdt: '48000.00',
      status: 'HELD',
      inspection_expires_at: new Date(Date.now() + 48 * 3600_000),
    });
  }

  const [existingDispute1] = await db
    .select()
    .from(disputes)
    .where(and(eq(disputes.source_type, 'AUCTION_LOT'), eq(disputes.source_id, lotEndedSold.id)))
    .limit(1);
  if (!existingDispute1) {
    await db.insert(disputes).values({
      source_type: 'AUCTION_LOT',
      source_id: lotEndedSold.id,
      opened_by: recycler1User.id,
      against_user_id: partnerUser.id,
      reason: 'Contaminated scrap received: Lot was graded as clean cullet glass, but contained ~15% ceramic and stone debris.',
      evidence_urls: [
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
      ],
      status: 'OPEN',
    });
  }

  const [existingDispute2] = await db
    .select()
    .from(disputes)
    .where(and(eq(disputes.source_type, 'DEPOSIT'), eq(disputes.source_id, deposit2.id)))
    .limit(1);
  if (!existingDispute2) {
    await db.insert(disputes).values({
      source_type: 'DEPOSIT',
      source_id: deposit2.id,
      opened_by: student1User.id,
      against_user_id: adminOrgUser.id,
      reason: 'Scale reading at BUET bin differed from declared weight.',
      evidence_urls: ['https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80'],
      status: 'RESOLVED',
      resolution: 'UPHELD',
      resolution_notes: 'Collector scale photo verified 10.0kg accurate.',
      resolved_by: adminOrgUser.id,
      resolved_at: new Date(Date.now() - 24 * 3600_000),
    });
  }

}
