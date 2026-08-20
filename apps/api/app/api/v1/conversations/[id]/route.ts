import { requireAuth } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';
import { messagesService } from '@/lib/services/messagesService';

export const GET = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const { id } = await params;

  try {
    const messages = await messagesService.getConversationMessages(auth.user.userId, id);
    return apiData({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load messages';
    if (message === 'Conversation not found') return apiError(message, 404);
    if (message === 'Forbidden') return apiError(message, 403);
    throw error;
  }
});
export { OPTIONS } from '@/lib/http';
