import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export function useMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () =>
      apiRequest<{ messages: Message[] }>(`/api/conversations/${conversationId}`).then((data) => data.messages),
    enabled: Boolean(conversationId),
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      apiRequest<{ message: Message }>('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ conversationId, body }),
      }).then((data) => data.message),
    onSuccess: (newMessage) => {
      queryClient.setQueryData<Message[]>(['messages', conversationId], (existing) => [
        ...(existing ?? []),
        newMessage,
      ]);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return { ...query, sendMessage: sendMutation.mutateAsync, isSending: sendMutation.isPending };
}
