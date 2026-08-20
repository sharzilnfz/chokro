import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Conversation } from '@/hooks/useStartConversation';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiRequest<{ conversations: Conversation[] }>('/api/conversations').then((data) => data.conversations),
  });
}
