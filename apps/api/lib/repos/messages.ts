import { db, messages, eq, asc } from '@chokro/db';
import { withDb } from './seam';

export interface CreateMessageInput {
  conversationId: string;
  senderId: string;
  body: string;
}

export const messageRepo = {
  async listByConversation(conversationId: string) {
    return withDb(async () => {
      return db
        .select()
        .from(messages)
        .where(eq(messages.conversation_id, conversationId))
        .orderBy(asc(messages.created_at));
    });
  },

  async create(input: CreateMessageInput) {
    return withDb(async () => {
      const [message] = await db
        .insert(messages)
        .values({
          conversation_id: input.conversationId,
          sender_id: input.senderId,
          body: input.body,
        })
        .returning();
      return message;
    });
  },
};
