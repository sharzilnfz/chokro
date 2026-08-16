// http: shared HTTP plumbing for API routes — CORS headers, error boundaries for
// handlers, and the standard success/error response builders.
//
// Next.js response helpers and the shared route error mapper.
import { NextResponse } from 'next/server';
import { routeError } from './database';

// Static cross-origin headers stamped onto every API response.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

// Stamp the standard CORS headers onto an existing response.
function withCors<R extends Response>(response: R): R {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// Empty 204 answer to browser preflight requests.
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// Wrap a handler so errors are converted into mapped responses and CORS headers
// are always applied — handlers never throw out of the route.
export function safeRoute<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>,
) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      return withCors(await handler(...args));
    } catch (error) {
      return withCors(routeError(error));
    }
  };
}

// JSON error response, optionally carrying structured details.
export function apiError(message: string, status: number, details?: unknown): NextResponse {
  const body = details === undefined ? { error: message } : { error: message, details };
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

// JSON message response, optionally merged with a data object.
export function apiSuccess(message: string, data?: object, status = 200): NextResponse {
  return NextResponse.json({ message, ...data }, { status, headers: CORS_HEADERS });
}

// Raw JSON data response, no message wrapper.
export function apiData(data: object, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

// Re-exported so handlers can reach the error mapper through this one module.
export { routeError } from './database';
