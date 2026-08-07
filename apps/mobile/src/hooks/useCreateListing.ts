import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

type CreateListingPayload = {
  category: string;
  unit: 'kg' | 'piece';
  declaredWeight?: number;
  pieceCount?: number;
  declaredCondition: string;
  photos: string[];
};

export function useCreateListing() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateListingPayload) =>
      apiRequest('/api/listings', {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
