// Posts a new listing and refreshes the feed cache on success.
// Mutation infra, query cache, the API client, and the shared request schema.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import { CreateListingSchema } from '@chokro/shared';

// Submit payload validated by the same Zod schema the API enforces server-side.
export type CreateListingPayload = Pick<
  ReturnType<typeof CreateListingSchema.parse>,
  'category' | 'unit' | 'declaredWeight' | 'pieceCount' | 'declaredCondition' | 'price' | 'photos'
>;

// Mutation that POSTs the listing then invalidates the feed.
export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    // Submit the payload as a JSON POST to the listings endpoint.
    mutationFn: (payload: CreateListingPayload) =>
      apiRequest('/api/listings', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    // Reload the feed so the fresh listing appears immediately.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
