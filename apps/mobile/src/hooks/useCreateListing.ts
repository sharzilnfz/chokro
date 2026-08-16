import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { CreateListingInput } from '@/types';

export type CreateListingPayload = CreateListingInput;


export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateListingPayload) =>
      apiRequest('/api/listings', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
