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

// Raised by withDb or domain logic when a unique constraint or concurrency conflict occurs.
export class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

// Raised by withDb or domain logic on check constraint or validation violations.
export class BadRequestError extends Error {
  constructor(message = 'Bad request') {
    super(message);
    this.name = 'BadRequestError';
  }
}

// Raised when a requested resource does not exist.
export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

// Map conflict to 409, bad request to 400, not found to 404, unavailability to 503, and everything else to 500.
export function routeError(error: unknown) {
  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof BadRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof DatabaseUnavailableError) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
