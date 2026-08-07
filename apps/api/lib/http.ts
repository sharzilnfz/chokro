import { NextResponse } from 'next/server';
import { routeError } from './database';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export function safeRoute<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>,
) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      const res = await handler(...args);
      Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        res.headers.set(key, value);
      });
      return res;
    } catch (error) {
      const res = routeError(error);
      Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        res.headers.set(key, value);
      });
      return res;
    }
  };
}

export function apiError(message: string, status: number, details?: unknown): NextResponse {
  const body = details === undefined ? { error: message } : { error: message, details };
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function apiSuccess(message: string, data?: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json({ message, ...data }, { status, headers: CORS_HEADERS });
}

export function apiData(data: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export { routeError } from './database';
