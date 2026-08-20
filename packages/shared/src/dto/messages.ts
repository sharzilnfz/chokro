import { z } from 'zod';

export const CreateConversationSchema = z.object({
  listingId: z.string().uuid(),
});
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;

export const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
