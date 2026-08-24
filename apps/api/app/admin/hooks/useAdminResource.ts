// Factory seam for admin console data hooks (deepening C10): one template for session-gated
// queries with envelope unwrapping, and mutations with typed payloads and cache invalidation.
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ZodType } from 'zod';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';

// Shared read options: optional polling cadence and an optional response schema.
export type AdminResourceOptions<TData> = {
  refetchInterval?: number;
  // When provided, the JSON body is parsed through it before unwrapping.
  schema?: ZodType<TData>;
};

// Session-gated object read: fetches `url` once the admin session is active.
export function useAdminResource<TData>(
  key: readonly unknown[],
  url: string,
  options: AdminResourceOptions<TData> = {},
) {
  const { status } = useAdminAuth();

  return useQuery<TData>({
    queryKey: key,
    queryFn: () =>
      adminApiRequest<TData>(url, options.schema ? { schema: options.schema } : {}),
    enabled: status === 'signed-in',
    refetchInterval: options.refetchInterval,
  });
}

// List read: fetches `url` and unwraps the envelope field into a guaranteed array.
export function useAdminList<TEnvelope, TRow>(
  key: readonly unknown[],
  url: string,
  pickRows: (data: TEnvelope) => TRow[] | undefined | null,
  options: AdminResourceOptions<TEnvelope> = {},
) {
  const { status } = useAdminAuth();

  return useQuery<TRow[]>({
    queryKey: key,
    queryFn: async () => {
      const data = await adminApiRequest<TEnvelope>(
        url,
        options.schema ? { schema: options.schema } : {},
      );
      const rows = pickRows(data);
      return Array.isArray(rows) ? rows : [];
    },
    enabled: status === 'signed-in',
    refetchInterval: options.refetchInterval,
  });
}

// Mutation descriptor: target path (static or derived from the variables), request method,
// payload builder, optional response schema with a result selector, and cache keys to
// invalidate on success.
export type AdminActionConfig<TData, TVars> = {
  path: string | ((vars: TVars) => string);
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload?: (vars: TVars) => unknown;
  // Optional Zod schema validating the response envelope...
  schema?: ZodType<any>;
  // ...plus a selector projecting the parsed envelope onto the mutation result.
  select?: (data: any) => TData;
  invalidate?: readonly (readonly unknown[])[];
};

// Mutation template: JSON-encodes the built payload and invalidates the given cache keys.
export function useAdminAction<TData = unknown, TVars = void>(
  config: AdminActionConfig<TData, TVars>,
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVars>({
    mutationFn: async (vars) => {
      const path = typeof config.path === 'function' ? config.path(vars) : config.path;
      const body = config.payload ? config.payload(vars) : undefined;

      const data = await adminApiRequest<any>(path, {
        method: config.method ?? 'POST',
        ...(body !== undefined
          ? {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }
          : {}),
        ...(config.schema ? { schema: config.schema } : {}),
      });
      return config.select ? config.select(data) : (data as TData);
    },
    onSuccess: () => {
      for (const key of config.invalidate ?? []) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
