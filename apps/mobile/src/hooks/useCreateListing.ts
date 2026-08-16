import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';

type CreateListingPayload = {
  category: string;
  unit: 'kg' | 'piece';
  declaredWeight?: number;
  pieceCount?: number;
  declaredCondition: string;
  price: number;
  photos: string[];
};

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
