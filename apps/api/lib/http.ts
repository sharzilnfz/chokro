// http: shared HTTP plumbing for API routes — CORS headers, error boundaries for
// handlers, and the standard success/error response builders.
//
// Next.js response helpers and the shared route error mapper.
import { NextResponse } from 'next/server';
import { routeError } from './database';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8082',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (!envOrigins || !envOrigins.trim()) {
    return DEFAULT_ALLOWED_ORIGINS;
  }
  return envOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return false;
  const allowed = getAllowedOrigins();
  return allowed.includes(origin);
}

export function getCorsHeaders(
  req?: Request | { headers?: { get(key: string): string | null } } | null,
): Record<string, string> {
  const origin = req?.headers?.get?.('origin') ?? req?.headers?.get?.('Origin');
  if (origin && isOriginAllowed(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Vary': 'Origin',
    };
  }
  return {};
}

// Stamp the standard CORS headers onto an existing response if origin is allowed.
export function withCors<R extends Response>(
  response: R,
  req?: Request | { headers?: { get(key: string): string | null } } | null,
): R {
  const corsHeaders = getCorsHeaders(req);
  if (corsHeaders['Access-Control-Allow-Origin']) {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  } else {
    response.headers.delete('Access-Control-Allow-Origin');
  }
  return response;
}

// Empty 204 answer to browser preflight requests.
export function OPTIONS(req?: Request) {
  const headers = getCorsHeaders(req);
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

// Wrap a handler so errors are converted into mapped responses and CORS headers
// are always applied — handlers never throw out of the route.
export function safeRoute<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>,
) {
  return async (...args: TArgs): Promise<Response> => {
    const req =
      args[0] && typeof (args[0] as { headers?: { get?: unknown } }).headers?.get === 'function'
        ? (args[0] as Request)
        : null;
    try {
      return withCors(await handler(...args), req);
    } catch (error) {
      return withCors(routeError(error), req);
    }
  };
}

// JSON error response, optionally carrying structured details.
export function apiError(message: string, status: number, details?: unknown): NextResponse {
  const body = details === undefined ? { error: message } : { error: message, details };
  return NextResponse.json(body, { status });
}

// JSON message response, optionally merged with a data object.
export function apiSuccess(message: string, data?: object, status = 200): NextResponse {
  return NextResponse.json({ message, ...data }, { status });
}

// Raw JSON data response, no message wrapper.
export function apiData(data: object, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// Re-exported so handlers can reach the error mapper through this one module.
export { routeError } from './database';

