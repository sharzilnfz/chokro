import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';

export type Conversation = {
  id: string;
  listingId: string;
  listingCategory: string;
  listingPhoto?: string | null;
  peerEmail: string;
  lastMessageBody?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
};

export function useStartConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) =>
      apiRequest<{ conversation: Conversation }>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ listingId }),
      }).then((data) => data.conversation),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
