import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';

type FeedData = { pages: Array<{ items: Array<{ id: string; saved?: boolean }> }> };

function applySavedState(old: unknown, listingId: string, saved: boolean): unknown {
  if (typeof old !== 'object' || old === null) return old;
  const d = old as FeedData;
  if (!Array.isArray(d.pages)) return old;
  return {
    ...d,
    pages: d.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => (item.id === listingId ? { ...item, saved } : item)),
    })),
  };
}

export function useSaveListing() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ listingId, save }: { listingId: string; save: boolean }) =>
      apiRequest<{ saved: boolean }>(`/api/listings/${listingId}/save`, {
        method: save ? 'POST' : 'DELETE',
      }).then((data) => data.saved),
    onMutate: async ({ listingId, save }) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const previous = queryClient.getQueriesData<unknown>({ queryKey: ['feed'] });
      queryClient.setQueriesData({ queryKey: ['feed'] }, (old) => applySavedState(old, listingId, save));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['saved-listings'] });
    },
  });

  return {
    save: mutation.mutate,
    saveAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    variables: mutation.variables,
  };
}