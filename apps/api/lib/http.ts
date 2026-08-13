import { NextResponse } from 'next/server';
import { routeError } from './database';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

function withCors<R extends Response>(response: R): R {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

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
      return withCors(await handler(...args));
    } catch (error) {
      return withCors(routeError(error));
    }
  };
}

export function apiError(message: string, status: number, details?: unknown): NextResponse {
  const body = details === undefined ? { error: message } : { error: message, details };
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function apiSuccess(message: string, data?: object, status = 200): NextResponse {
  return NextResponse.json({ message, ...data }, { status, headers: CORS_HEADERS });
}

export function apiData(data: object, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export { routeError } from './database';
