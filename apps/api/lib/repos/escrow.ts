// escrow repo: persistence for B2B auction escrow holds (Ticket 09b / SPEC 13)
import { db, escrowHolds, eq, desc, and, lt } from '@chokro/db';
import { withDb } from './seam';

export type EscrowHold = typeof escrowHolds.$inferSelect;

export interface CreateEscrowHoldInput {
  lot_id: string;
  buyer_id: string;
  seller_id: string;
  amount_bdt: string;
  status?: string;
  inspection_expires_at: Date;
}

export interface UpdateEscrowHoldInput {
  status?: string;
  inspection_expires_at?: Date;
}

export const escrowRepo = {
  async create(input: CreateEscrowHoldInput) {
    return withDb(async () => {
      const [hold] = await db
        .insert(escrowHolds)
        .values({
          lot_id: input.lot_id,
          buyer_id: input.buyer_id,
          seller_id: input.seller_id,
          amount_bdt: input.amount_bdt,
          status: input.status || 'HELD',
          inspection_expires_at: input.inspection_expires_at,
        })
        .returning();
      return hold;
    });
  },

  async findById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(escrowHolds)
        .where(eq(escrowHolds.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findByLotId(lotId: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(escrowHolds)
        .where(eq(escrowHolds.lot_id, lotId))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findExpiredHeld(asOf = new Date()) {
    return withDb(async () => {
      return db
        .select()
        .from(escrowHolds)
        .where(and(eq(escrowHolds.status, 'HELD'), lt(escrowHolds.inspection_expires_at, asOf)));
    });
  },

  async updateStatus(id: string, status: string) {
    return withDb(async () => {
      const [updated] = await db
        .update(escrowHolds)
        .set({ status })
        .where(eq(escrowHolds.id, id))
        .returning();
      return updated || null;
    });
  },

  async listByBuyer(buyerId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(escrowHolds)
        .where(eq(escrowHolds.buyer_id, buyerId))
        .orderBy(desc(escrowHolds.created_at));
    });
  },

  async listBySeller(sellerId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(escrowHolds)
        .where(eq(escrowHolds.seller_id, sellerId))
        .orderBy(desc(escrowHolds.created_at));
    });
  },
};
