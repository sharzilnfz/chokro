// Posts a new listing and refreshes the feed cache on success.
// Mutation infra, query cache, and the API client.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';

// Fields required to create a listing via the API.
type CreateListingPayload = {
  category: string;
  unit: 'kg' | 'piece';
  declaredWeight?: number;
  pieceCount?: number;
  declaredCondition: string;
  price: number;
  photos: string[];
};

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
