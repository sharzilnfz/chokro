import { conversationRepo } from '@/lib/repos/conversations';
import { messageRepo } from '@/lib/repos/messages';
import { listingRepo } from '@/lib/repos/listings';

export interface ConversationSummary {
  id: string;
  listingId: string;
  listingCategory: string;
  listingPhoto?: string | null;
  peerEmail: string;
  lastMessageBody?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
}

export interface MessageView {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

type ConversationRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_body: string | null;
  last_message_at: Date | null;
  created_at: Date;
};

function isParticipant(conversation: Pick<ConversationRow, 'buyer_id' | 'seller_id'>, userId: string): boolean {
  return conversation.buyer_id === userId || conversation.seller_id === userId;
}

function firstPhoto(photos: unknown): string | null {
  return Array.isArray(photos) && typeof photos[0] === 'string' ? photos[0] : null;
}

function toSummary(
  conversation: ConversationRow,
  peerEmail: string,
  listing: { category: string; photos?: unknown },
): ConversationSummary {
  return {
    id: conversation.id,
    listingId: conversation.listing_id,
    listingCategory: listing.category,
    listingPhoto: firstPhoto(listing.photos),
    peerEmail,
    lastMessageBody: conversation.last_message_body ?? null,
    lastMessageAt: conversation.last_message_at ? new Date(conversation.last_message_at).toISOString() : null,
    createdAt: new Date(conversation.created_at).toISOString(),
  };
}

function toMessageView(message: { id: string; conversation_id: string; sender_id: string; body: string; created_at: Date | string }): MessageView {
  return {
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    body: message.body,
    createdAt: new Date(message.created_at).toISOString(),
  };
}

export const MessagingDomain = {
  async startConversation(buyerId: string, listingId: string): Promise<ConversationSummary> {
    const listing = await listingRepo.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }
    const sellerId = listing.owner_id;
    if (buyerId === sellerId) {
      throw new Error('You cannot start a conversation with yourself');
    }

    let conversation = await conversationRepo.findByListingAndBuyer(listingId, buyerId, sellerId);
    if (!conversation) {
      conversation = await conversationRepo.create({ listingId, buyerId, sellerId });
    }

    const peerEmail = await this.peerEmail(conversation, buyerId);
    return toSummary(conversation, peerEmail, listing);
  },

  async peerEmail(conversation: ConversationRow, viewerId: string): Promise<string> {
    const rows = await conversationRepo.listForUser(viewerId);
    const found = rows.find((row) => row.id === conversation.id);
    if (!found) {
      throw new Error('Conversation not found');
    }
    return viewerId === found.buyer_id ? found.seller_email : found.buyer_email;
  },

  async listConversations(userId: string): Promise<ConversationSummary[]> {
    const rows = await conversationRepo.listForUser(userId);
    return rows.map((row) => {
      const peerEmail = userId === row.buyer_id ? row.seller_email : row.buyer_email;
      return {
        id: row.id,
        listingId: row.listing_id,
        listingCategory: row.listing_category,
        listingPhoto: firstPhoto(row.listing_photos),
        peerEmail,
        lastMessageBody: row.last_message_body ?? null,
        lastMessageAt: row.last_message_at ? new Date(row.last_message_at).toISOString() : null,
        createdAt: new Date(row.created_at).toISOString(),
      };
    });
  },

  async getConversationMessages(userId: string, conversationId: string): Promise<MessageView[]> {
    const conversation = await conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    if (!isParticipant(conversation, userId)) {
      throw new Error('Forbidden');
    }
    const messages = await messageRepo.listByConversation(conversationId);
    return messages.map(toMessageView);
  },

  async sendMessage(userId: string, input: { conversationId: string; body: string }): Promise<MessageView> {
    const conversation = await conversationRepo.findById(input.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    if (!isParticipant(conversation, userId)) {
      throw new Error('Forbidden');
    }
    const message = await messageRepo.create({ conversationId: input.conversationId, senderId: userId, body: input.body });
    await conversationRepo.touch(input.conversationId, input.body);
    return toMessageView(message);
  },
};
