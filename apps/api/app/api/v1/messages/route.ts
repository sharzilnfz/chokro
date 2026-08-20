import { SendMessageSchema } from '@chokro/shared';
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';
import { messagesService } from '@/lib/services/messagesService';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const parsed = SendMessageSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError('Invalid message', 400);
  }

  try {
    const message = await messagesService.sendMessage(auth.user.userId, parsed.data);
    return apiData({ message }, 201);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Could not send message';
    if (messageText === 'Conversation not found') return apiError(messageText, 404);
    if (messageText === 'Forbidden') return apiError(messageText, 403);
    throw error;
  }
});
export { OPTIONS } from '@/lib/http';
