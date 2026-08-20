// Composes the admin console's providers: React Query, auth context, and a top-level error boundary.
'use client';

// React Query cache/mutation wiring plus context/boundary dependencies.
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
  // Build the QueryClient once, tuned for admin console fetch patterns.
  const [queryClient] = useState(() => {
    // Log expired-session errors without letting them surface to UI; auth is handled by the context.
    const handleAuthError = (error: unknown) => {
      if (error instanceof AdminApiError && error.status === 401) {
        console.warn('[AdminProviders] Caught 401 in query cache');
      }
    };

    return new QueryClient({
      queryCache: new QueryCache({ onError: handleAuthError }),
      mutationCache: new MutationCache({ onError: handleAuthError }),
      defaultOptions: {
        queries: {
          staleTime: 1000 * 30, // 30 seconds fresh cache
          gcTime: 1000 * 60 * 5, // 5 minutes garbage collection
          refetchOnWindowFocus: false,
          // Never retry auth failures; allow two retries for transient errors.
          retry: (failureCount, error) => {
            if (error instanceof AdminApiError && (error.status === 401 || error.status === 403)) {
              return false; // Do not retry auth errors
            }
            return failureCount < 2;
          },
        },
      },
    });
  });

  // Nest query, auth, and boundary providers so all admin content gets the same runtime.
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
