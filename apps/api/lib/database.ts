import { NextResponse } from 'next/server';

export class DatabaseUnavailableError extends Error {
  constructor() {
    super('Database unavailable');
  }
}

export function routeError(error: unknown) {
  if (error instanceof DatabaseUnavailableError) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
