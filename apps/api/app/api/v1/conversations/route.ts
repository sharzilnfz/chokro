import { CreateConversationSchema } from '@chokro/shared';
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, safeRoute } from '@/lib/http';
import { MessagingDomain } from '@/lib/domain/MessagingDomain';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const conversations = await MessagingDomain.listConversations(auth.user.userId);
  return apiData({ conversations });
});

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const parsed = CreateConversationSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError('Invalid conversation request', 400);
  }

  try {
    const conversation = await MessagingDomain.startConversation(auth.user.userId, parsed.data.listingId);
    return apiData({ conversation }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start conversation';
    if (message === 'Listing not found') return apiError(message, 404);
    if (message === 'You cannot start a conversation with yourself') return apiError(message, 400);
    throw error;
  }
});
export { OPTIONS } from '@/lib/http';
