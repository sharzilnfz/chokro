import { NextResponse } from 'next/server';
import { routeError } from './database';

/**
 * Wraps a route handler so unexpected errors surface through the shared
 * `routeError` mapping (503 for a dead database, 500 otherwise) instead of
 * each handler repeating its own try/catch.
 */
export function safeRoute<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>,
) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return routeError(error);
    }
  };
}

/** Canonical error payload: always `{ error }`, plus `details` only when given. */
export function apiError(message: string, status: number, details?: unknown): NextResponse {
  if (details === undefined) {
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ error: message, details }, { status });
}
/** Canonical success payload: always `{ message }`, plus any extra data spread in. */
export function apiSuccess(message: string, data?: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json({ message, ...data }, { status });
}

/** Data-only payload (no message): spreads the record as the JSON body. */
export function apiData(data: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export { routeError } from './database';
