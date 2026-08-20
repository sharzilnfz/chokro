import { db, conversations, users, listings, eq, and, or, desc, alias } from '@chokro/db';
import { withDb } from './seam';

export interface CreateConversationInput {
  listingId: string;
  buyerId: string;
  sellerId: string;
}

const buyers = alias(users, 'buyers');
const sellers = alias(users, 'sellers');

export const conversationRepo = {
  async findByListingAndBuyer(listingId: string, buyerId: string, sellerId: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.listing_id, listingId),
          eq(conversations.buyer_id, buyerId),
          eq(conversations.seller_id, sellerId),
        ))
        .limit(1);
      return rows[0] || null;
    });
  },

  async findById(id: string) {
    return withDb(async () => {
      const rows = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1);
      return rows[0] || null;
    });
  },

  async create(input: CreateConversationInput) {
    return withDb(async () => {
      const [conversation] = await db
        .insert(conversations)
        .values({
          listing_id: input.listingId,
          buyer_id: input.buyerId,
          seller_id: input.sellerId,
        })
        .returning();
      return conversation;
    });
  },

  async touch(id: string, body: string) {
    return withDb(async () => {
      const [updated] = await db
        .update(conversations)
        .set({ last_message_body: body, last_message_at: new Date() })
        .where(eq(conversations.id, id))
        .returning();
      return updated || null;
    });
  },

  async listForUser(userId: string) {
    return withDb(async () => {
      return db
        .select({
          id: conversations.id,
          listing_id: conversations.listing_id,
          buyer_id: conversations.buyer_id,
          seller_id: conversations.seller_id,
          last_message_body: conversations.last_message_body,
          last_message_at: conversations.last_message_at,
          created_at: conversations.created_at,
          listing_category: listings.category,
          listing_photos: listings.photos,
          buyer_email: buyers.email,
          seller_email: sellers.email,
        })
        .from(conversations)
        .innerJoin(listings, eq(listings.id, conversations.listing_id))
        .innerJoin(buyers, eq(buyers.id, conversations.buyer_id))
        .innerJoin(sellers, eq(sellers.id, conversations.seller_id))
        .where(or(
          eq(conversations.buyer_id, userId),
          eq(conversations.seller_id, userId),
        ))
        .orderBy(desc(conversations.last_message_at), desc(conversations.created_at));
    });
  },
};
