'use client';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { AdminErrorBoundary } from '../components/ui/AdminErrorBoundary';
import { AdminAuthProvider } from '../context/AdminAuthContext';
import { AdminApiError } from '../services/adminApi';

export function AdminProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof AdminApiError && error.status === 401) {
              console.warn('[AdminProviders] Caught 401 in QueryCache');
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (error instanceof AdminApiError && error.status === 401) {
              console.warn('[AdminProviders] Caught 401 in MutationCache');
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30, // 30 seconds fresh cache
            gcTime: 1000 * 60 * 5, // 5 minutes garbage collection
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (error instanceof AdminApiError && (error.status === 401 || error.status === 403)) {
                return false; // Do not retry auth errors
              }
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <AdminErrorBoundary fallbackTitle="Console failed to load">
          {children}
        </AdminErrorBoundary>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}
