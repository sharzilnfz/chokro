// database: the DB-unavailability marker thrown by the repo seam and the shared
// routeError mapper that turns failures into HTTP responses.
//
// Next.js response helper for error JSON.
import { NextResponse } from 'next/server';

// Raised by withDb whenever the driver is absent or a query fails at the transport level.
export class DatabaseUnavailableError extends Error {
  constructor() {
    super('Database unavailable');
  }
}

// Map unavailability to 503 (retriable) and everything else to a generic 500.
export function routeError(error: unknown) {
  if (error instanceof DatabaseUnavailableError) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
